import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { loadLogApi } from '../services/loadLogApi';
import type { LoggedSet, WorkoutDayWithLoggedExercises } from '../types';
import {
    getCompletedPlannedSets,
    getExerciseOutcome,
} from '../utils/workout_evaluation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutHistoryDetail'>;

const WorkoutHistoryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
    const { dayId } = route.params;
    const [dayHistory, setDayHistory] = useState<WorkoutDayWithLoggedExercises | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function loadHistory() {
            setLoading(true);
            setError('');

            try {
                const history = await loadLogApi.workouts.getWorkoutDayHistory(dayId);

                if (isMounted) {
                    setDayHistory(history);
                }
            } catch (err) {
                let message = 'Failed to load workout history.';

                if (err instanceof Error && err.message) {
                    message = err.message;
                }

                if (isMounted) {
                    setError(message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void loadHistory();

        return () => {
            isMounted = false;
        };
    }, [dayId]);

    const getSetRows = (
        targetSets: number,
        targetReps: number,
        currentWeight: number,
        logs: LoggedSet[]
    ) => {
        const rowCount = Math.max(targetSets, logs.length);

        return Array.from({ length: rowCount }, (_, index) => {
            const log = logs[index] ?? null;

            return {
                setNumber: index + 1,
                plannedWeight: currentWeight,
                plannedReps: targetReps,
                loggedWeight: log?.weight_used ?? null,
                loggedReps: log?.reps_completed ?? null,
                completed: log?.completed ?? null,
            };
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>

                <View style={styles.headerCard}>
                    <Text style={styles.logo}>
                        <Text style={styles.red}>Load</Text>
                        <Text style={styles.white}>Log</Text>
                    </Text>
                    <Text style={styles.title}>Workout History</Text>
                    {dayHistory && (
                        <>
                            <Text style={styles.subtitle}>{dayHistory.muscle_group}</Text>
                            <Text style={styles.meta}>{dayHistory.scheduled_date}</Text>
                            <Text style={styles.meta}>Status: {dayHistory.status}</Text>
                        </>
                    )}
                </View>

                {loading && (
                    <View style={styles.card}>
                        <ActivityIndicator size="large" color="red" />
                        <Text style={styles.loadingText}>Loading workout details...</Text>
                    </View>
                )}

                {!loading && !!error && (
                    <View style={[styles.card, styles.errorCard]}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {!loading && dayHistory && (
                    <View style={styles.historyList}>
                        {dayHistory.exercises.map((exercise) => {
                            const completedSets = getCompletedPlannedSets(exercise, exercise.logs);
                            const outcome = getExerciseOutcome(exercise, exercise.logs);
                            const setRows = getSetRows(
                                exercise.target_sets,
                                exercise.target_reps,
                                exercise.current_weight,
                                exercise.logs
                            );
                            let topWeight = 0;

                            for (let i = 0; i < exercise.logs.length; i++) {
                                if (exercise.logs[i].weight_used > topWeight) {
                                    topWeight = exercise.logs[i].weight_used;
                                }
                            }

                            return (
                                <View key={exercise.id} style={styles.card}>
                                    <View style={styles.exerciseHeader}>
                                        <View style={styles.exerciseHeaderLeft}>
                                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                                            <Text style={styles.exerciseMeta}>
                                                Planned {exercise.target_sets} x {exercise.target_reps} @{' '}
                                                {exercise.current_weight} lbs
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.outcomePill,
                                                outcome === 'completed'
                                                    ? styles.outcomeCompleted
                                                    : outcome === 'partial'
                                                      ? styles.outcomePartial
                                                      : styles.outcomeMissed,
                                            ]}
                                        >
                                            <Text style={styles.outcomePillText}>{outcome}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.summaryRow}>
                                        <View style={styles.summaryBox}>
                                            <Text style={styles.summaryLabel}>Planned Sets</Text>
                                            <Text style={styles.summaryValue}>{exercise.target_sets}</Text>
                                        </View>
                                        <View style={styles.summaryBox}>
                                            <Text style={styles.summaryLabel}>Successful Sets</Text>
                                            <Text style={styles.summaryValue}>{completedSets}</Text>
                                        </View>
                                        <View style={styles.summaryBox}>
                                            <Text style={styles.summaryLabel}>Top Weight</Text>
                                            <Text style={styles.summaryValue}>
                                                {topWeight > 0 ? `${topWeight} lbs` : '--'}
                                            </Text>
                                        </View>
                                    </View>

                                    {exercise.logs.length === 0 ? (
                                        <Text style={styles.emptyText}>
                                            No sets were logged for this exercise.
                                        </Text>
                                    ) : (
                                        <View style={styles.table}>
                                            <View style={styles.tableHeader}>
                                                <Text style={[styles.headerCell, styles.setCol]}>SET</Text>
                                                <Text style={[styles.headerCell, styles.planCol]}>PLAN</Text>
                                                <Text style={[styles.headerCell, styles.weightCol]}>LB</Text>
                                                <Text style={[styles.headerCell, styles.repsCol]}>REPS</Text>
                                                <Text style={[styles.headerCell, styles.statusCol]}>DONE</Text>
                                            </View>

                                            {setRows.map((row) => (
                                                <View key={`${exercise.id}-row-${row.setNumber}`} style={styles.tableRow}>
                                                    <Text style={[styles.rowCell, styles.setCol]}>
                                                        {row.setNumber}
                                                    </Text>
                                                    <Text style={[styles.rowCell, styles.planCol]}>
                                                        {row.plannedWeight} x {row.plannedReps}
                                                    </Text>
                                                    <Text style={[styles.rowCell, styles.weightCol]}>
                                                        {row.loggedWeight ?? '--'}
                                                    </Text>
                                                    <Text style={[styles.rowCell, styles.repsCol]}>
                                                        {row.loggedReps ?? '--'}
                                                    </Text>
                                                    <Text style={[styles.rowCell, styles.statusCol]}>
                                                        {row.completed === null
                                                            ? '--'
                                                            : row.completed
                                                              ? 'Yes'
                                                              : 'No'}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    screen: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 16,
        backgroundColor: '#181818',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    headerCard: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        alignItems: 'center',
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
        marginBottom: 8,
    },
    subtitle: {
        color: 'red',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 6,
    },
    meta: {
        color: '#d1d5db',
        fontSize: 15,
        marginBottom: 2,
    },
    historyList: {
        gap: 14,
    },
    card: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    errorCard: {
        backgroundColor: '#2a1111',
        borderColor: '#7f1d1d',
    },
    errorText: {
        color: '#fca5a5',
        fontSize: 15,
    },
    loadingText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        marginTop: 12,
    },
    exerciseName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 10,
    },
    exerciseHeaderLeft: {
        flex: 1,
    },
    exerciseMeta: {
        color: '#b8bcc3',
        fontSize: 14,
    },
    outcomePill: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
    },
    outcomeCompleted: {
        backgroundColor: '#0f2f1c',
        borderColor: '#22c55e',
    },
    outcomePartial: {
        backgroundColor: '#2e2100',
        borderColor: '#f59e0b',
    },
    outcomeMissed: {
        backgroundColor: '#2a1111',
        borderColor: '#ef4444',
    },
    outcomePillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 14,
    },
    summaryBox: {
        flex: 1,
        minWidth: 100,
        backgroundColor: '#101010',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 12,
    },
    summaryLabel: {
        color: '#9ca3af',
        fontSize: 12,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    summaryValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    emptyText: {
        color: '#d1d5db',
        fontSize: 15,
    },
    table: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 10,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#101010',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#242424',
    },
    headerCell: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '700',
        paddingVertical: 10,
        paddingHorizontal: 8,
        textTransform: 'uppercase',
    },
    rowCell: {
        color: '#fff',
        fontSize: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    setCol: {
        width: 52,
    },
    planCol: {
        flex: 1.3,
    },
    weightCol: {
        flex: 0.8,
    },
    repsCol: {
        flex: 0.8,
    },
    statusCol: {
        flex: 0.8,
    },
});

export default WorkoutHistoryDetailScreen;
