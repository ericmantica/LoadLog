import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../App';
import type { InsertLoggedSet } from '../types';
import { loadLogApi } from '../services/loadLogApi';
import { getWorkoutDayStatus } from '../utils/workout_evaluation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogger'>;

type SetEntry = {
    id: string;
    weight: string;
    reps: string;
    completed: boolean;
};

type ExerciseLogState = {
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    currentWeight: number;
    sets: SetEntry[];
};

const WorkoutLoggerScreen: React.FC<Props> = ({ navigation, route }) => {
    const { day } = route.params;

    const initialExercises = useMemo<ExerciseLogState[]>(() => {
        return day.exercises.map((exercise) => ({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            targetSets: exercise.target_sets,
            targetReps: exercise.target_reps,
            currentWeight: exercise.current_weight,
            sets: Array.from({ length: exercise.target_sets }, (_, index) => ({
                id: `${exercise.id}-set-${index + 1}`,
                weight: String(exercise.current_weight),
                reps: String(exercise.target_reps),
                completed: false,
            })),
        }));
    }, [day.exercises]);

    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogState[]>(initialExercises);
    const [saving, setSaving] = useState(false);

    const updateSetField = (
        exerciseId: string,
        setId: string,
        field: 'weight' | 'reps',
        value: string
    ) => {
        setExerciseLogs((prev) =>
            prev.map((exercise) => {
                if (exercise.exerciseId !== exerciseId) return exercise;

                return {
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                        set.id === setId ? { ...set, [field]: value } : set
                    ),
                };
            })
        );
    };

    const toggleSetComplete = (exerciseId: string, setId: string) => {
        setExerciseLogs((prev) =>
            prev.map((exercise) => {
                if (exercise.exerciseId !== exerciseId) return exercise;

                return {
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                        set.id === setId ? { ...set, completed: !set.completed } : set
                    ),
                };
            })
        );
    };

    const addSet = (exerciseId: string, currentWeight: number, targetReps: number) => {
        setExerciseLogs((prev) =>
            prev.map((exercise) => {
                if (exercise.exerciseId !== exerciseId) return exercise;

                const nextSetNumber = exercise.sets.length + 1;

                return {
                    ...exercise,
                    sets: [
                        ...exercise.sets,
                        {
                            id: `${exerciseId}-set-${nextSetNumber}`,
                            weight: String(currentWeight),
                            reps: String(targetReps),
                            completed: false,
                        },
                    ],
                };
            })
        );
    };

    const handleFinishWorkout = async () => {
        const logsToInsert: InsertLoggedSet[] = [];

        for (let i = 0; i < exerciseLogs.length; i++) {
            const exercise = exerciseLogs[i];

            for (let j = 0; j < exercise.sets.length; j++) {
                const set = exercise.sets[j];
                const weight = Number(set.weight);
                const reps = Number(set.reps);

                if (
                    !Number.isFinite(weight) ||
                    weight < 0 ||
                    !Number.isFinite(reps) ||
                    reps < 0
                ) {
                    Alert.alert(
                        'Invalid input',
                        'Weights and reps must be valid non-negative numbers.'
                    );
                    return;
                }

                logsToInsert.push({
                    exercise_id: exercise.exerciseId,
                    set_number: j + 1,
                    reps_completed: reps,
                    weight_used: weight,
                    completed: set.completed,
                });
            }
        }

        if (logsToInsert.length === 0) {
            Alert.alert('No sets to save', 'Please add at least one set before finishing.');
            return;
        }

        setSaving(true);

        try {
            await loadLogApi.workouts.replaceDayLogs(day.id, logsToInsert);

            const logsByExerciseId: Record<string, typeof logsToInsert> = {};

            for (let i = 0; i < logsToInsert.length; i++) {
                const loggedSet = logsToInsert[i];

                if (!logsByExerciseId[loggedSet.exercise_id]) {
                    logsByExerciseId[loggedSet.exercise_id] = [];
                }

                logsByExerciseId[loggedSet.exercise_id].push(loggedSet);
            }

            const workoutDayStatus = getWorkoutDayStatus(
                day.exercises.map((exercise) => ({
                    target_sets: exercise.target_sets,
                    target_reps: exercise.target_reps,
                    current_weight: exercise.current_weight,
                })),
                logsByExerciseId,
                day.exercises.map((exercise) => exercise.id)
            );

            await loadLogApi.workouts.updateWorkoutDayStatus(day.id, workoutDayStatus);

            const session = await loadLogApi.auth.getSession();

            if (session) {
                await loadLogApi.stats.updateStreak(session.id);
            }

            Alert.alert('Workout saved', 'Your workout has been logged successfully.');
            navigation.goBack();
        } catch (error) {
            let message = 'Failed to save workout.';

            if (error instanceof Error && error.message) {
                message = error.message;
            }

            Alert.alert('Save failed', message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.logo}>
                        <Text style={styles.red}>Load</Text>
                        <Text style={styles.white}>Log</Text>
                    </Text>

                    <Text style={styles.title}>
                        Day {day.day_number} · {day.muscle_group}
                    </Text>

                    <Text style={styles.subtitle}>{day.scheduled_date}</Text>
                </View>

                {exerciseLogs.map((exercise, exerciseIndex) => (
                    <View key={exercise.exerciseId} style={styles.exerciseSection}>
                        <View style={styles.exerciseTopRow}>
                            <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                        </View>

                        <View style={styles.exerciseHintBox}>
                            <Text style={styles.exerciseHintText}>
                                Target: {exercise.targetSets} sets · {exercise.targetReps} reps ·{' '}
                                {exercise.currentWeight} lbs
                            </Text>
                        </View>

                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.setCol]}>SET</Text>
                            <Text style={[styles.headerCell, styles.weightCol]}>LB</Text>
                            <Text style={[styles.headerCell, styles.repsCol]}>REPS</Text>
                            <Text style={[styles.headerCell, styles.checkCol]}>✓</Text>
                        </View>

                        {exercise.sets.map((set, setIndex) => (
                            <View key={set.id} style={styles.setRow}>
                                <Text style={[styles.setLabel, styles.setCol]}>
                                    {setIndex + 1}
                                </Text>

                                <TextInput
                                    style={[styles.inputBox, styles.weightCol]}
                                    value={set.weight}
                                    onChangeText={(value) =>
                                        updateSetField(exercise.exerciseId, set.id, 'weight', value)
                                    }
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#777"
                                />

                                <TextInput
                                    style={[styles.inputBox, styles.repsCol]}
                                    value={set.reps}
                                    onChangeText={(value) =>
                                        updateSetField(exercise.exerciseId, set.id, 'reps', value)
                                    }
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#777"
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.checkButton,
                                        styles.checkCol,
                                        set.completed && styles.checkButtonComplete,
                                    ]}
                                    onPress={() => toggleSetComplete(exercise.exerciseId, set.id)}
                                >
                                    <Text
                                        style={[
                                            styles.checkButtonText,
                                            set.completed && styles.checkButtonTextComplete,
                                        ]}
                                    >
                                        ✓
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.addSetButton}
                            onPress={() =>
                                addSet(
                                    exercise.exerciseId,
                                    exercise.currentWeight,
                                    exercise.targetReps
                                )
                            }
                        >
                            <Text style={styles.addSetButtonText}>ADD SET</Text>
                        </TouchableOpacity>

                        {exerciseIndex < exerciseLogs.length - 1 && (
                            <View style={styles.divider} />
                        )}
                    </View>
                ))}

                <TouchableOpacity
                    style={[styles.finishButton, saving && styles.finishButtonDisabled]}
                    onPress={handleFinishWorkout}
                    disabled={saving}
                >
                    <Text style={styles.finishButtonText}>
                        {saving ? 'Saving...' : 'Finish Workout'}
                    </Text>
                </TouchableOpacity>
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
    header: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    logo: {
        fontSize: 38,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    red: {
        color: 'red',
    },
    white: {
        color: '#fff',
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        color: '#b3b3b3',
        fontSize: 16,
        textAlign: 'center',
    },
    exerciseSection: {
        backgroundColor: '#181818',
        borderRadius: 14,
        padding: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    exerciseTopRow: {
        marginBottom: 12,
    },
    exerciseTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    exerciseHintBox: {
        backgroundColor: '#2a2410',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    exerciseHintText: {
        color: '#f3e8a3',
        fontSize: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    headerCell: {
        color: '#d1d5db',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    setCol: {
        width: 36,
    },
    weightCol: {
        flex: 1,
    },
    repsCol: {
        flex: 1,
    },
    checkCol: {
        width: 54,
    },
    setLabel: {
        color: 'red',
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    inputBox: {
        backgroundColor: '#3a3f44',
        color: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 20,
        textAlign: 'center',
    },
    checkButton: {
        backgroundColor: '#3a3f44',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    checkButtonComplete: {
        backgroundColor: 'red',
    },
    checkButtonText: {
        color: '#d1d5db',
        fontSize: 26,
        fontWeight: '800',
    },
    checkButtonTextComplete: {
        color: '#fff',
    },
    addSetButton: {
        marginTop: 6,
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    addSetButtonText: {
        color: 'red',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#2a2a2a',
        marginTop: 18,
    },
    finishButton: {
        backgroundColor: 'red',
        borderRadius: 10,
        paddingVertical: 16,
        marginTop: 6,
    },
    finishButtonDisabled: {
        opacity: 0.65,
    },
    finishButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '800',
    },
});

export default WorkoutLoggerScreen;
