import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type {
    DashboardSection,
    UserProfile,
    PlanWithDetails,
    RecentWorkoutHistoryItem,
    Streak,
} from '../types';
import {
    loadExistingPlanForUser,
    generateOrRegeneratePlan,
} from '../planFlow';
import { didProfileChange } from '../planUtils';
import { loadLogApi } from '../services/loadLogApi';
import PlanScreen from './PlanScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        const normalizedMessage = error.message.toLowerCase();

        if (
            normalizedMessage.includes('weekly_plans_user_id_week_start_key') ||
            normalizedMessage.includes('duplicate key value violates unique constraint')
        ) {
            return 'The current week plan could not be replaced. Run the latest Supabase schema script to add delete policies, then try again.';
        }

        if (
            normalizedMessage.includes('row-level security') &&
            normalizedMessage.includes('delete')
        ) {
            return 'Plan regeneration needs the latest Supabase delete policies. Re-run scripts/supabase_schema.sql, then try again.';
        }

        return error.message;
    }

    return fallback;
}

const PlanContainerScreen: React.FC<Props> = ({ navigation, route }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [planOutput, setPlanOutput] = useState<PlanWithDetails | null>(null);
    const [activeSection, setActiveSection] =
        useState<DashboardSection>('weekly-plan');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [streak, setStreak] = useState<Streak | null>(null);
    const [recentHistory, setRecentHistory] = useState<RecentWorkoutHistoryItem[]>([]);

    function getPlanTrainingDays(plan: PlanWithDetails | null): number {
        if (!plan) {
            return 0;
        }

        return plan.days.filter((day) => day.muscle_group !== 'Rest').length;
    }

    function getPlanFitnessLevel(
        plan: PlanWithDetails | null
    ): UserProfile['fitness_level'] | null {
        if (!plan) {
            return null;
        }

        const activeDay = plan.days.find(
            (day) => day.muscle_group !== 'Rest' && day.exercises.length > 0
        );

        if (!activeDay) {
            return null;
        }

        const referenceExercise = activeDay.exercises[0];

        if (
            referenceExercise.target_sets === 2 &&
            referenceExercise.target_reps === 10
        ) {
            return 'beginner';
        }

        if (
            referenceExercise.target_sets === 3 &&
            referenceExercise.target_reps === 8
        ) {
            return 'intermediate';
        }

        if (
            referenceExercise.target_sets === 4 &&
            referenceExercise.target_reps === 6
        ) {
            return 'advanced';
        }

        return null;
    }

    const derivedPlanTrainingDays = getPlanTrainingDays(planOutput);
    const derivedPlanFitnessLevel = getPlanFitnessLevel(planOutput);
    const isPlanAlignedWithPreferences =
        !!user &&
        !!planOutput &&
        derivedPlanTrainingDays === user.available_days_per_week &&
        derivedPlanFitnessLevel === user.fitness_level;

    useEffect(() => {
        let isMounted = true;

        async function loadInitialData(showLoading: boolean) {
            if (showLoading && isMounted) {
                setInitialLoading(true);
            }

            if (isMounted) {
                setError('');
                setMessage('');
            }

            try {
                const sessionProfile = await loadLogApi.auth.getSession();

                if (!sessionProfile) {
                    if (isMounted) {
                        setError('No active session. Please log in.');
                        setInitialLoading(false);
                    }
                    return;
                }

                let profile = sessionProfile;

                try {
                    profile = await loadLogApi.users.getProfile(sessionProfile.id);
                } catch {
                    profile = sessionProfile;
                }

                const [existingPlan, currentStreak, history] = await Promise.all([
                    loadExistingPlanForUser(loadLogApi, profile.id),
                    loadLogApi.stats.getStreak(profile.id),
                    loadLogApi.stats.getRecentWorkoutHistory(profile.id, 5),
                ]);

                if (!isMounted) {
                    return;
                }

                setUser(profile);
                setPlanOutput(existingPlan);
                setStreak(currentStreak);
                setRecentHistory(history);

                if (existingPlan) {
                    setMessage('Loaded existing plan.');
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        getErrorMessage(err, 'Failed to load user or existing plan.')
                    );
                }
            } finally {
                if (isMounted) {
                    setInitialLoading(false);
                }
            }
        }

        void loadInitialData(true);

        const unsubscribe = navigation.addListener('focus', () => {
            void loadInitialData(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [navigation]);

    async function handleGenerate() {
        if (!user) {
            setError('User not loaded.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const result = await generateOrRegeneratePlan(loadLogApi, user);
            setPlanOutput(result.plan);
            setMessage(result.message);

            const [currentStreak, history] = await Promise.all([
                loadLogApi.stats.getStreak(user.id),
                loadLogApi.stats.getRecentWorkoutHistory(user.id, 5),
            ]);
            setStreak(currentStreak);
            setRecentHistory(history);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to generate plan.'));
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateProfile(
        updates: Pick<UserProfile, 'fitness_level' | 'available_days_per_week'>
    ) {
        if (!user) {
            setError('User not loaded.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const updatedProfile = await loadLogApi.users.updateProfile(user.id, updates);
            const profileChanged = didProfileChange(user, updatedProfile);

            setUser(updatedProfile);

            if (profileChanged) {
                setMessage(
                    "Preferences saved. Click Generate Plan to apply them to this week's plan."
                );
            } else {
                setMessage('Preferences saved.');
            }

            const [currentStreak, history] = await Promise.all([
                loadLogApi.stats.getStreak(updatedProfile.id),
                loadLogApi.stats.getRecentWorkoutHistory(updatedProfile.id, 5),
            ]);
            setStreak(currentStreak);
            setRecentHistory(history);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to update profile.'));
        } finally {
            setLoading(false);
        }
    }

    if (initialLoading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="red" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <PlanScreen
            navigation={navigation}
            route={route}
            user={user}
            plan={planOutput}
            loading={loading}
            message={message}
            error={error}
            streak={streak}
            recentHistory={recentHistory}
            activeSection={activeSection}
            isPlanAlignedWithPreferences={isPlanAlignedWithPreferences}
            onChangeSection={setActiveSection}
            onGenerate={handleGenerate}
            onUpdateProfile={handleUpdateProfile}
        />
    );
};

const styles = StyleSheet.create({
    loadingScreen: {
        flex: 1,
        backgroundColor: '#0f0f0f',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 12,
    },
});

export default PlanContainerScreen;
