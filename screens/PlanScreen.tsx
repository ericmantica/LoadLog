import React from 'react';
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
import type { PlanWithDetails, UserProfile } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

type PlanScreenInnerProps = Props & {
    user: UserProfile | null;
    plan: PlanWithDetails | null;
    loading: boolean;
    message: string;
    error: string;
    onGenerate: () => void;
    onRegenerate: () => void;
};

const PlanScreen: React.FC<PlanScreenInnerProps> = ({
    navigation,
    user,
    plan,
    loading,
    message,
    error,
    onGenerate,
    onRegenerate,
}) => {
    const getTodayDayNumber = (): number => {
        const jsDay = new Date().getDay();
        return jsDay === 0 ? 7 : jsDay;
    };

    const getDayLabel = (dayNumber: number): string => {
        if (dayNumber === 1) return 'Monday';
        if (dayNumber === 2) return 'Tuesday';
        if (dayNumber === 3) return 'Wednesday';
        if (dayNumber === 4) return 'Thursday';
        if (dayNumber === 5) return 'Friday';
        if (dayNumber === 6) return 'Saturday';
        return 'Sunday';
    };

    const getTrainingDaysCount = (): number => {
        if (!plan) return 0;

        let count = 0;
        for (let i = 0; i < plan.days.length; i++) {
            if (plan.days[i].muscle_group !== 'Rest') {
                count += 1;
            }
        }
        return count;
    };

    const getExerciseCount = (): number => {
        if (!plan) return 0;

        let count = 0;
        for (let i = 0; i < plan.days.length; i++) {
            count += plan.days[i].exercises.length;
        }
        return count;
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

        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
                <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                    <View style={styles.headerCard}>
                        <Text style={styles.logo}>
                            <Text style={styles.red}>Load</Text>
                            <Text style={styles.white}>Log</Text>
                        </Text>

                        <Text style={styles.title}>Weekly Workout Plan</Text>

                        {user && (
                            <View style={styles.userInfo}>
                                <Text style={styles.userInfoText}>User: {user.display_name}</Text>
                                <Text style={styles.userInfoText}>
                                    Fitness Level: {user.fitness_level}
                                </Text>
                                <Text style={styles.userInfoText}>
                                    Days / Week: {user.available_days_per_week}
                                </Text>
                            </View>
                        )}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.button, (!user || loading) && styles.buttonDisabled]}
                                onPress={onGenerate}
                                disabled={!user || loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Generating...' : 'Generate Plan'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.secondaryButton,
                                    (!user || loading) && styles.buttonDisabled,
                                ]}
                                onPress={onRegenerate}
                                disabled={!user || loading}
                            >
                                <Text style={styles.secondaryButtonText}>Regenerate Plan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {renderAlert()}

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

                    {plan && (
                        <>
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Weekly Summary</Text>

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
                                        <Text style={styles.summaryValue}>{getTrainingDaysCount()}</Text>
                                    </View>

                                    <View style={styles.summaryBox}>
                                        <Text style={styles.summaryLabel}>Total Exercises</Text>
                                        <Text style={styles.summaryValue}>{getExerciseCount()}</Text>
                                    </View>
                                </View>
                            </View>

                            {plan.days.map((day) => {
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
                                                <Text style={styles.dayMeta}>Status: {day.status}</Text>
                                            </View>

                                            {isToday && (
                                                <View style={styles.todayBadge}>
                                                    <Text style={styles.todayBadgeText}>Today</Text>
                                                </View>
                                            )}
                                        </View>
                                        {isToday && !isRestDay && (
                                            <TouchableOpacity
                                                style={styles.startWorkoutButton}
                                                onPress={() => {
                                                    const workoutDay = day as WorkoutDayWithExercises;
                                                    navigation.navigate('WorkoutLogger', { day: workoutDay });
                                                }}
                                            >
                                                <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
                                            </TouchableOpacity>
                                        )}
                                        {isRestDay ? (
                                            <View style={styles.restBox}>
                                                <Text style={styles.restText}>Rest Day</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.exerciseList}>
                                                {day.exercises.map((exercise) => (
                                                    <View key={exercise.id} style={styles.exerciseCard}>
                                                        <Text style={styles.exerciseName}>{exercise.name}</Text>

                                                        <View style={styles.tagRow}>
                                                            <View style={[styles.tag, styles.blueTag]}>
                                                                <Text style={styles.tagText}>
                                                                    {exercise.target_sets} sets
                                                                </Text>
                                                            </View>

                                                            <View style={[styles.tag, styles.grayTag]}>
                                                                <Text style={styles.tagText}>
                                                                    {exercise.target_reps} reps
                                                                </Text>
                                                            </View>

                                                            <View style={[styles.tag, styles.greenTag]}>
                                                                <Text style={styles.tagText}>
                                                                    {exercise.current_weight} lbs
                                                                </Text>
                                                            </View>

                                                            <View style={[styles.tag, styles.redTag]}>
                                                                <Text style={styles.tagText}>
                                                                    +{exercise.progression_step} lbs
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    };

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    headerCard: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
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
        marginBottom: 10,
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
        marginBottom: 18,
    },
    userInfo: {
        marginBottom: 18,
    },
    userInfoText: {
        color: '#d1d5db',
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'center',
    },
    buttonRow: {
        gap: 12,
    },
    button: {
        backgroundColor: 'red',
        padding: 14,
        borderRadius: 8,
    },
    secondaryButton: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 8,
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
    secondaryButtonText: {
        color: '#0f0f0f',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
    alertBox: {
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
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
    sectionTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 16,
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
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    dayHeaderLeft: {
        flex: 1,
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
        borderRadius: 10,
        padding: 14,
        backgroundColor: '#101010',
    },
    exerciseName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    blueTag: {
        backgroundColor: '#172554',
    },
    grayTag: {
        backgroundColor: '#1f2937',
    },
    greenTag: {
        backgroundColor: '#052e16',
    },
    redTag: {
        backgroundColor: '#450a0a',
    },
    tagText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    startWorkoutButton: {
        backgroundColor: 'red',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 16,
        marginBottom: 4,
    },
    startWorkoutButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default PlanScreen;