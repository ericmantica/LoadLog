import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, WorkoutDayWithExercises } from '../App';
import type {
    DashboardSection,
    LoggedSet,
    PlanWithDetails,
    RecentWorkoutHistoryItem,
    Streak,
    UserProfile,
} from '../types';
import {
    getCompletedPlannedSets,
    getExerciseOutcome,
} from '../utils/workout_evaluation';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

type PlanScreenInnerProps = Props & {
    user: UserProfile | null;
    plan: PlanWithDetails | null;
    loading: boolean;
    message: string;
    error: string;
    streak: Streak | null;
    recentHistory: RecentWorkoutHistoryItem[];
    activeSection: DashboardSection;
    isPlanAlignedWithPreferences: boolean;
    onChangeSection: (section: DashboardSection) => void;
    onGenerate: () => void;
    onUpdateProfile: (
        updates: Pick<UserProfile, 'fitness_level' | 'available_days_per_week'>
    ) => void;
};

const FITNESS_LEVELS: UserProfile['fitness_level'][] = [
    'beginner',
    'intermediate',
    'advanced',
];

const SECTIONS: { key: DashboardSection; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'activities', label: 'Activities' },
    { key: 'weekly-plan', label: 'Weekly Plan' },
];

function getTodayDayNumber(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
}

function getDayLabel(dayNumber: number): string {
    if (dayNumber === 1) return 'Monday';
    if (dayNumber === 2) return 'Tuesday';
    if (dayNumber === 3) return 'Wednesday';
    if (dayNumber === 4) return 'Thursday';
    if (dayNumber === 5) return 'Friday';
    if (dayNumber === 6) return 'Saturday';
    return 'Sunday';
}

const PlanScreen: React.FC<PlanScreenInnerProps> = ({
    navigation,
    user,
    plan,
    loading,
    message,
    error,
    streak,
    recentHistory,
    activeSection,
    isPlanAlignedWithPreferences,
    onChangeSection,
    onGenerate,
    onUpdateProfile,
}) => {
    const [fitnessLevel, setFitnessLevel] =
        useState<UserProfile['fitness_level']>('beginner');
    const [daysPerWeek, setDaysPerWeek] = useState(3);

    useEffect(() => {
        if (!user) {
            return;
        }

        setFitnessLevel(user.fitness_level);
        setDaysPerWeek(user.available_days_per_week);
    }, [user]);

    const hasPreferenceChanges =
        !!user &&
        (fitnessLevel !== user.fitness_level ||
            daysPerWeek !== user.available_days_per_week);

    const getExerciseCount = (): number => {
        if (!plan) {
            return 0;
        }

        let count = 0;
        for (let i = 0; i < plan.days.length; i++) {
            count += plan.days[i].exercises.length;
        }
        return count;
    };

    const getPlanTrainingDays = (): number => {
        if (!plan) {
            return 0;
        }

        return plan.days.filter((day) => day.muscle_group !== 'Rest').length;
    };

    const getStatusTone = (status: string) => {
        if (status === 'completed') {
            return styles.statusCompleted;
        }

        if (status === 'partial') {
            return styles.statusPartial;
        }

        if (status === 'missed') {
            return styles.statusMissed;
        }

        return styles.statusScheduled;
    };

    const getExerciseLogSummary = (
        exercise: {
            target_sets: number;
            target_reps: number;
            current_weight: number;
            logs?: LoggedSet[];
        }
    ) => {
        const logs = exercise.logs ?? [];

        if (logs.length === 0) {
            return null;
        }

        const completedSets = getCompletedPlannedSets(exercise, logs);
        const outcome = getExerciseOutcome(exercise, logs);
        let topWeight = 0;
        let bestReps = 0;

        for (let i = 0; i < logs.length; i++) {
            if (logs[i].weight_used > topWeight) {
                topWeight = logs[i].weight_used;
            }

            if (logs[i].reps_completed > bestReps) {
                bestReps = logs[i].reps_completed;
            }
        }

        return {
            completedSets,
            totalLoggedSets: logs.length,
            topWeight,
            bestReps,
            outcome,
        };
    };

    const renderAlert = () => {
        if (error) {
            return (
                <View style={[styles.alertBox, styles.errorBox]}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            );
        }

        if (message) {
            return (
                <View style={[styles.alertBox, styles.messageBox]}>
                    <Text style={styles.messageText}>{message}</Text>
                </View>
            );
        }

        return null;
    };

    const getProfileNotice = (): string => {
        if (!plan) {
            return 'No weekly plan yet. Save preferences here, then click Generate Plan in Weekly Plan when you are ready.';
        }

        if (isPlanAlignedWithPreferences) {
            return 'Current plan already matches your saved preferences.';
        }

        return "Preferences saved. Click Generate Plan to apply them to this week's plan.";
    };

    const getWeeklyPlanHelperText = (): string => {
        if (!plan) {
            return 'Generate a plan for this week.';
        }

        if (!isPlanAlignedWithPreferences) {
            return "Generate Plan to apply your saved preferences to this week's plan.";
        }

        return 'Generate Plan to refresh this week while preserving logged workout history.';
    };

    const renderSectionTabs = () => (
        <View style={styles.topBar}>
            {SECTIONS.map((section) => {
                const isActive = section.key === activeSection;

                return (
                    <TouchableOpacity
                        key={section.key}
                        style={[
                            styles.topBarButton,
                            isActive && styles.topBarButtonActive,
                        ]}
                        onPress={() => onChangeSection(section.key)}
                    >
                        <Text
                            style={[
                                styles.topBarButtonText,
                                isActive && styles.topBarButtonTextActive,
                            ]}
                        >
                            {section.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderProfileSection = () => (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Training Preferences</Text>
            <View
                style={[
                    styles.noticeBox,
                    isPlanAlignedWithPreferences
                        ? styles.noticeBoxPositive
                        : styles.noticeBoxNeutral,
                ]}
            >
                <Text
                    style={[
                        styles.noticeText,
                        isPlanAlignedWithPreferences
                            ? styles.noticeTextPositive
                            : styles.noticeTextNeutral,
                    ]}
                >
                    {getProfileNotice()}
                </Text>
            </View>

            <Text style={styles.preferenceHint}>
                Saving updates your profile only. Weekly Plan is where you apply those saved
                preferences to this week.
            </Text>
            <Text style={styles.preferenceDetail}>
                Beginner: no lifting experience. Intermediate: about 6 months of training.
                Advanced: about 1 year of training.
            </Text>

            <Text style={styles.preferenceLabel}>Fitness Level</Text>
            <View style={styles.levelRow}>
                {FITNESS_LEVELS.map((level) => {
                    const isSelected = level === fitnessLevel;

                    return (
                        <TouchableOpacity
                            key={level}
                            style={[
                                styles.levelChip,
                                isSelected && styles.levelChipSelected,
                                (!user || loading) && styles.buttonDisabled,
                            ]}
                            onPress={() => setFitnessLevel(level)}
                            disabled={!user || loading}
                        >
                            <Text
                                style={[
                                    styles.levelChipText,
                                    isSelected && styles.levelChipTextSelected,
                                ]}
                            >
                                {level}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.preferenceLabel}>Training Days / Week</Text>
            <View style={styles.daysRow}>
                <TouchableOpacity
                    style={[styles.stepButton, (!user || loading) && styles.buttonDisabled]}
                    onPress={() => setDaysPerWeek((current) => Math.max(1, current - 1))}
                    disabled={!user || loading}
                >
                    <Text style={styles.stepButtonText}>-</Text>
                </TouchableOpacity>

                <View style={styles.daysValueBox}>
                    <Text style={styles.daysValue}>{daysPerWeek}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.stepButton, (!user || loading) && styles.buttonDisabled]}
                    onPress={() => setDaysPerWeek((current) => Math.min(7, current + 1))}
                    disabled={!user || loading}
                >
                    <Text style={styles.stepButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[
                    styles.preferenceSaveButton,
                    (!user || loading || !hasPreferenceChanges) && styles.buttonDisabled,
                ]}
                onPress={() =>
                    onUpdateProfile({
                        fitness_level: fitnessLevel,
                        available_days_per_week: daysPerWeek,
                    })
                }
                disabled={!user || loading || !hasPreferenceChanges}
            >
                <Text style={styles.preferenceSaveButtonText}>Save Preferences</Text>
            </TouchableOpacity>
        </View>
    );

    const renderActivitiesSection = () => (
        <>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Weekly Summary</Text>
                {!plan ? (
                    <Text style={styles.emptyText}>No plan generated yet.</Text>
                ) : (
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Week Start</Text>
                            <Text style={styles.summaryValue}>{plan.week_start}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Status</Text>
                            <Text style={styles.summaryValue}>{plan.status}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Training Days</Text>
                            <Text style={styles.summaryValue}>{getPlanTrainingDays()}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Total Exercises</Text>
                            <Text style={styles.summaryValue}>{getExerciseCount()}</Text>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Streaks</Text>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Current Streak</Text>
                        <Text style={styles.summaryValue}>{streak?.current_streak ?? 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Longest Streak</Text>
                        <Text style={styles.summaryValue}>{streak?.longest_streak ?? 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Last Workout</Text>
                        <Text style={styles.summaryValue}>
                            {streak?.last_workout_date || 'No workouts yet'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent Workout History</Text>
                {recentHistory.length === 0 ? (
                    <Text style={styles.emptyText}>No logged workouts yet.</Text>
                ) : (
                    <View style={styles.historyList}>
                        {recentHistory.map((item) => (
                            <TouchableOpacity
                                key={item.day_id}
                                style={styles.historyCard}
                                onPress={() =>
                                    navigation.navigate('WorkoutHistoryDetail', {
                                        dayId: item.day_id,
                                    })
                                }
                            >
                                <View style={styles.historyTopRow}>
                                    <Text style={styles.historyExercise}>{item.muscle_group}</Text>
                                    <View style={[styles.statusPill, getStatusTone(item.outcome)]}>
                                        <Text style={styles.statusPillText}>{item.outcome}</Text>
                                    </View>
                                </View>
                                <Text style={styles.historyMeta}>{item.scheduled_date}</Text>
                                <Text style={styles.historyMeta}>
                                    {item.logged_exercises}/{item.total_exercises} exercises logged
                                </Text>
                                <Text style={styles.historyMeta}>
                                    {item.completed_exercises}/{item.total_exercises} exercises completed
                                </Text>
                                <Text style={styles.historyTapHint}>
                                    Tap to view exercise and set details
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </>
    );

    const renderWeeklyPlanSection = () => (
        <>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Weekly Plan</Text>
                <Text style={styles.preferenceHint}>{getWeeklyPlanHelperText()}</Text>
                <TouchableOpacity
                    style={[styles.button, (!user || loading) && styles.buttonDisabled]}
                    onPress={onGenerate}
                    disabled={!user || loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Updating...' : 'Generate Plan'}
                    </Text>
                </TouchableOpacity>
            </View>

            {!plan && !loading && !error && (
                <View style={styles.card}>
                    <Text style={styles.emptyText}>No plan loaded yet.</Text>
                </View>
            )}

            {loading && !plan && (
                <View style={styles.card}>
                    <ActivityIndicator size="large" color="red" />
                    <Text style={styles.loadingText}>Loading plan...</Text>
                </View>
            )}

            {plan &&
                plan.days.map((day) => {
                    const isToday = day.day_number === getTodayDayNumber();
                    const isRestDay = day.muscle_group === 'Rest';

                    return (
                        <View
                            key={day.id}
                            style={[
                                styles.card,
                                isRestDay && styles.restCard,
                                isToday && styles.todayCard,
                            ]}
                        >
                            <View style={styles.dayHeader}>
                                <View style={styles.dayHeaderLeft}>
                                    <Text style={styles.dayTitle}>
                                        Day {day.day_number} · {getDayLabel(day.day_number)}
                                    </Text>
                                    <Text style={styles.dayGroup}>{day.muscle_group}</Text>
                                    <Text style={styles.dayMeta}>Date: {day.scheduled_date}</Text>
                                </View>

                                <View style={styles.dayHeaderRight}>
                                    <View style={[styles.statusPill, getStatusTone(day.status)]}>
                                        <Text style={styles.statusPillText}>{day.status}</Text>
                                    </View>
                                    {isToday && (
                                        <View style={styles.todayBadge}>
                                            <Text style={styles.todayBadgeText}>Today</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {!isRestDay && isToday && (
                                <TouchableOpacity
                                    style={styles.startWorkoutButton}
                                    onPress={() => {
                                        const workoutDay = day as WorkoutDayWithExercises;
                                        navigation.navigate('WorkoutLogger', { day: workoutDay });
                                    }}
                                >
                                    <Text style={styles.startWorkoutButtonText}>Log Workout</Text>
                                </TouchableOpacity>
                            )}

                            {isRestDay ? (
                                <View style={styles.restBox}>
                                    <Text style={styles.restText}>Rest Day</Text>
                                </View>
                            ) : (
                                <View style={styles.exerciseList}>
                                    {day.exercises.map((exercise) => {
                                        const logSummary = getExerciseLogSummary(exercise);

                                        return (
                                            <View key={exercise.id} style={styles.exerciseCard}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>

                                                <View style={styles.exerciseColumns}>
                                                    <View style={styles.exerciseColumn}>
                                                        <Text style={styles.columnLabel}>Planned</Text>
                                                        <Text style={styles.columnValue}>
                                                            {exercise.target_sets} sets x {exercise.target_reps}{' '}
                                                            reps
                                                        </Text>
                                                        <Text style={styles.columnSubValue}>
                                                            {exercise.current_weight} lbs · +
                                                            {exercise.progression_step} lbs
                                                        </Text>
                                                    </View>

                                                    <View style={styles.exerciseColumn}>
                                                        <Text style={styles.columnLabel}>Logged</Text>
                                                        {logSummary ? (
                                                            <>
                                                                <Text style={styles.columnValue}>
                                                                    {logSummary.completedSets}/
                                                                    {exercise.target_sets} planned sets met
                                                                </Text>
                                                                <Text style={styles.columnSubValue}>
                                                                    {logSummary.totalLoggedSets} logged sets ·
                                                                    top {logSummary.topWeight} lbs
                                                                </Text>
                                                                <Text style={styles.columnSubValue}>
                                                                    Best reps: {logSummary.bestReps} ·{' '}
                                                                    {logSummary.outcome}
                                                                </Text>
                                                            </>
                                                        ) : (
                                                            <View style={styles.emptyLoggedSpace} />
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.shellHeader}>
                <Text style={styles.logo}>
                    <Text style={styles.red}>Load</Text>
                    <Text style={styles.white}>Log</Text>
                </Text>

                <Text style={styles.title}>Training Dashboard</Text>

                {user && (
                    <View style={styles.userInfo}>
                        <Text style={styles.userInfoText}>User: {user.display_name}</Text>
                        <Text style={styles.userInfoText}>Saved Level: {user.fitness_level}</Text>
                        <Text style={styles.userInfoText}>
                            Saved Days / Week: {user.available_days_per_week}
                        </Text>
                    </View>
                )}

                {renderSectionTabs()}
                {renderAlert()}
            </View>

            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                {activeSection === 'profile' && renderProfileSection()}
                {activeSection === 'activities' && renderActivitiesSection()}
                {activeSection === 'weekly-plan' && renderWeeklyPlanSection()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    shellHeader: {
        backgroundColor: '#181818',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    screen: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    restCard: {
        backgroundColor: '#141414',
    },
    todayCard: {
        borderColor: 'red',
        borderWidth: 2,
    },
    logo: {
        fontSize: 44,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    white: {
        color: '#fff',
    },
    red: {
        color: 'red',
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 14,
    },
    userInfo: {
        marginBottom: 14,
    },
    userInfoText: {
        color: '#d1d5db',
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'center',
    },
    topBar: {
        flexDirection: 'row',
        backgroundColor: '#111111',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 6,
        gap: 8,
    },
    topBarButton: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    topBarButtonActive: {
        backgroundColor: '#ff1a0a',
    },
    topBarButtonText: {
        color: '#9ca3af',
        fontSize: 15,
        fontWeight: '700',
    },
    topBarButtonTextActive: {
        color: '#0f0f0f',
    },
    alertBox: {
        borderRadius: 10,
        padding: 14,
        marginTop: 14,
    },
    errorBox: {
        backgroundColor: '#2a1111',
        borderWidth: 1,
        borderColor: '#7f1d1d',
    },
    messageBox: {
        backgroundColor: '#102014',
        borderWidth: 1,
        borderColor: '#166534',
    },
    errorText: {
        color: '#fca5a5',
        fontSize: 15,
    },
    messageText: {
        color: '#86efac',
        fontSize: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 16,
    },
    noticeBox: {
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
    },
    noticeBoxPositive: {
        backgroundColor: '#102014',
        borderColor: '#166534',
    },
    noticeBoxNeutral: {
        backgroundColor: '#1b1625',
        borderColor: '#7c3aed',
    },
    noticeText: {
        fontSize: 15,
        lineHeight: 21,
    },
    noticeTextPositive: {
        color: '#86efac',
    },
    noticeTextNeutral: {
        color: '#ddd6fe',
    },
    preferenceHint: {
        color: '#b8bcc3',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    preferenceDetail: {
        color: '#8b949e',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
    },
    preferenceLabel: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    levelRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    levelChip: {
        backgroundColor: '#181818',
        borderWidth: 1,
        borderColor: '#ff3b30',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    levelChipSelected: {
        backgroundColor: '#ff1a0a',
    },
    levelChipText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    levelChipTextSelected: {
        color: '#0f0f0f',
    },
    daysRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    stepButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#ff1a0a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepButtonText: {
        color: '#0f0f0f',
        fontSize: 24,
        fontWeight: '900',
    },
    daysValueBox: {
        flex: 1,
        backgroundColor: '#181818',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2f2f2f',
        alignItems: 'center',
        paddingVertical: 12,
    },
    daysValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    preferenceSaveButton: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    preferenceSaveButtonText: {
        color: '#0f0f0f',
        fontSize: 15,
        fontWeight: '900',
    },
    button: {
        backgroundColor: 'red',
        padding: 14,
        borderRadius: 10,
        marginTop: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#0f0f0f',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        color: '#fff',
        fontSize: 17,
        textAlign: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
    },
    summaryGrid: {
        gap: 12,
    },
    summaryBox: {
        backgroundColor: '#111111',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    summaryLabel: {
        color: '#9ca3af',
        fontSize: 13,
        marginBottom: 6,
    },
    summaryValue: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    historyList: {
        gap: 12,
    },
    historyCard: {
        backgroundColor: '#111111',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 14,
    },
    historyTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    historyExercise: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    historyMeta: {
        color: '#b8bcc3',
        fontSize: 14,
        marginBottom: 4,
    },
    historyTapHint: {
        color: '#ff8c8c',
        fontSize: 13,
        marginTop: 6,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    dayHeaderLeft: {
        flex: 1,
    },
    dayHeaderRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    dayTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
    },
    dayGroup: {
        color: 'red',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    dayMeta: {
        color: '#9ca3af',
        fontSize: 15,
        marginBottom: 2,
    },
    statusPill: {
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    statusScheduled: {
        backgroundColor: '#111111',
        borderColor: '#4b5563',
    },
    statusCompleted: {
        backgroundColor: '#0f2f1c',
        borderColor: '#22c55e',
    },
    statusPartial: {
        backgroundColor: '#2e2100',
        borderColor: '#f59e0b',
    },
    statusMissed: {
        backgroundColor: '#2a1111',
        borderColor: '#ef4444',
    },
    statusPillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    todayBadge: {
        backgroundColor: 'red',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    todayBadgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    restBox: {
        marginTop: 16,
        backgroundColor: '#101010',
        borderRadius: 10,
        padding: 14,
    },
    restText: {
        color: '#d1d5db',
        fontSize: 16,
    },
    exerciseList: {
        marginTop: 16,
        gap: 12,
    },
    exerciseCard: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        backgroundColor: '#111111',
        padding: 14,
    },
    exerciseName: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 12,
    },
    exerciseColumns: {
        flexDirection: 'row',
        gap: 12,
    },
    exerciseColumn: {
        flex: 1,
        minHeight: 74,
    },
    columnLabel: {
        color: '#9ca3af',
        fontSize: 13,
        marginBottom: 6,
    },
    columnValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    columnSubValue: {
        color: '#b8bcc3',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 4,
    },
    emptyLoggedSpace: {
        minHeight: 56,
    },
    startWorkoutButton: {
        marginTop: 16,
        backgroundColor: '#ff1a0a',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    startWorkoutButtonText: {
        color: '#0f0f0f',
        fontSize: 15,
        fontWeight: '900',
    },
});

export default PlanScreen;
