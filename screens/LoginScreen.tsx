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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        if (!email || !password) {
            Alert.alert('Missing info', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.navigate('Plan');
        }, 600);
    };

    return (
        <View style={styles.container}>
            {/* Logo */}
            <Text style={styles.logo}>
                <Text style={styles.red}>Load</Text>
                <Text style={styles.white}>Log</Text>
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="black"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="black"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <Text style={styles.rightText}>Forgot password?</Text>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#0f0f0f" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>

            <Text style={styles.signup}>
                Don't have an account?{' '}
                <Text
                    style={styles.link}
                    onPress={() => navigation.navigate('Signup')}
                >
                    Sign up
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

    link: {
        color: 'red',
        textDecorationLine: 'underline',
    },

    rightText: {
        textAlign: 'right',
        color: 'red',
    },
});

export default LoginScreen;