
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function CreateProfileScreen({ onProfileCreated }: { onProfileCreated: () => void }) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!fullName) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            Alert.alert('Error', 'No user found');
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('profiles').insert([
            {
                id: user.id,
                full_name: fullName,
                phone: phone,
                role: 'client',
            }
        ]);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            onProfileCreated();
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Profile</Text>
            <Text style={styles.subtitle}>You must create a profile to book appointments.</Text>

            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
            />
            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Save Profile'}</Text>
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
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 24,
        color: '#666',
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
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
