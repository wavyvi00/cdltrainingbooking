
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../types';

type Booking = Database['public']['Tables']['bookings']['Row'] & {
    services: Database['public']['Tables']['services']['Row'] | null
};

export default function MyBookingsScreen({ onClose }: { onClose: () => void }) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Join with services to get name
        const { data, error } = await supabase
            .from('bookings')
            .select('*, services(*)')
            .eq('client_id', user.id)
            .order('start_datetime', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            // Typescript casting for join result if needed, but Supabase JS usually handles it dynamically
            setBookings(data as any);
        }
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'requested': return '#F59E0B'; // Orange
            case 'accepted': return '#10B981'; // Green
            case 'declined': return '#EF4444'; // Red
            case 'countered': return '#8B5CF6'; // Purple
            default: return '#6B7280';
        }
    };


    const handleCancel = async (bookingId: string) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes', style: 'destructive', onPress: async () => {
                        const { error } = await supabase
                            .from('bookings')
                            .update({ status: 'cancelled' })
                            .eq('id', bookingId);

                        if (error) Alert.alert('Error', error.message);
                        else {
                            Alert.alert('Success', 'Booking cancelled');
                            fetchBookings(); // Refresh list
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Booking }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.serviceName}>{item.services?.name || 'Unknown Service'}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.date}>
                {new Date(item.start_datetime).toLocaleString()}
            </Text>
            <Text style={styles.price}>
                ${(item.services?.price_cents ? item.services.price_cents / 100 : 0).toFixed(2)}
            </Text>

            {['requested', 'accepted'].includes(item.status) && (
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancel(item.id)}
                >
                    <Text style={styles.cancelText}>Cancel Booking</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <Modal animationType="slide" visible={true} onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>My Bookings</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No bookings found.</Text>}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginTop: 40,
        backgroundColor: '#fff',
    },
    closeText: {
        color: '#007AFF',
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    date: {
        color: '#666',
        marginBottom: 4,
    },
    price: {
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    cancelButton: {
        marginTop: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 6,
        alignItems: 'center',
    },
    cancelText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    empty: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
    }
});
