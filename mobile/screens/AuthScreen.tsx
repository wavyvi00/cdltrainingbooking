
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async () => {
        setLoading(true);
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Check your email for confirmation!');
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) Alert.alert('Error', error.message);
            else onLoginSuccess();
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    switchText: {
        marginTop: 16,
        textAlign: 'center',
        color: '#007AFF',
    },
});
