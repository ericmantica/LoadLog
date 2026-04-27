import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { loadLogApi } from '../services/loadLogApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const SignupScreen: React.FC<Props> = ({ navigation }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSignup = async () => {
        setErrorMessage('');

        if (!name || !username || !password) {
            const message = 'Please fill in name, username, and password.';
            setErrorMessage(message);
            Alert.alert('Missing info', message);
            return;
        }

        setLoading(true);

        try {
            await loadLogApi.auth.signUp(username.trim(), password, name.trim());
            setLoading(false);
            navigation.replace('Plan');
        } catch (error) {
            setLoading(false);

            let message = 'Failed to create account. Please try again.';

            if (error instanceof Error && error.message) {
                message = error.message;
            }

            setErrorMessage(message);
            Alert.alert('Sign up failed', message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.logo}>
                <Text style={styles.red}>Load</Text>
                <Text style={styles.white}>Log</Text>
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor="black"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="black"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="black"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#0f0f0f" />
                ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                )}
            </TouchableOpacity>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <Text style={styles.signup}>
                Already have an account?{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                    Log in
                </Text>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0f0f0f',
    },
    logo: {
        fontSize: 70,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 20,
    },
    white: {
        color: '#fff',
    },
    red: {
        color: 'red',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: 'white',
        color: 'black',
        borderRadius: 8,
        padding: 12,
        marginVertical: 10,
    },
    button: {
        backgroundColor: 'red',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        marginBottom: 20,
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
    signup: {
        fontSize: 15,
        color: '#fff',
        textAlign: 'center',
    },
    errorText: {
        color: '#ff8c8c',
        textAlign: 'center',
        marginBottom: 12,
        fontSize: 14,
    },
    link: {
        color: 'red',
        textDecorationLine: 'underline',
    },
});

export default SignupScreen;
