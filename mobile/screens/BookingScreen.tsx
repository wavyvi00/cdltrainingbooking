
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../types';
import * as WebBrowser from 'expo-web-browser';

type Service = Database['public']['Tables']['services']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function BookingScreen({
    service,
    userProfile,
    onClose,
    onSuccess
}: {
    service: Service;
    userProfile: Profile;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [paymentType, setPaymentType] = useState<'cash' | 'deposit' | 'full'>('cash');

    useEffect(() => {
        fetchSlots();
    }, [selectedDate]);

    const fetchSlots = async () => {
        const slots = [];
        for (let i = 9; i < 17; i++) {
            slots.push(`${i}:00`);
            slots.push(`${i}:30`);
        }
        setAvailableSlots(slots);
    };

    const handleBook = async () => {
        if (!selectedTime) {
            Alert.alert('Error', 'Please select a time');
            return;
        }

        setLoading(true);

        // 1. Prepare Data
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const startDatetime = new Date(selectedDate);
        startDatetime.setHours(hours, minutes, 0, 0);

        const endDatetime = new Date(startDatetime);
        endDatetime.setMinutes(endDatetime.getMinutes() + service.duration_min);

        const { data: barbers } = await supabase.from('profiles').select('id').eq('role', 'barber').limit(1);
        const barberId = barbers?.[0]?.id;

        if (!barberId) {
            Alert.alert('Error', 'No barbers found!');
            setLoading(false);
            return;
        }

        // 2. Insert Booking (Status: Requested)
        const { data: booking, error } = await supabase.from('bookings').insert([
            {
                client_id: userProfile.id,
                barber_id: barberId,
                service_id: service.id,
                start_datetime: startDatetime.toISOString(),
                end_datetime: endDatetime.toISOString(),
                status: 'requested',
                payment_type: paymentType,
                paid_amount_cents: 0
            }
        ]).select().single();

        if (error || !booking) {
            Alert.alert('Error', error?.message || 'Booking creation failed');
            setLoading(false);
            return;
        }

        // 3. Handle Payment
        if (paymentType === 'cash') {
            Alert.alert('Success', 'Booking requested! Pay cash at the shop.');
            onSuccess();
        } else {
            // Stripe Flow
            try {
                // Backend URL (Use your machine's IP if testing on real device, or localhost for simulator)
                // For Expo Go on Android, localhost doesn't work. Use 10.0.2.2 or real IP.
                // Assuming simulator/web for now or environment variable.
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

                const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        booking_id: booking.id,
                        payment_type: paymentType,
                        success_url: 'roycuts://success', // Deep link (requires config) or just close browser
                        cancel_url: 'roycuts://cancel'
                    })
                });

                const { url } = await response.json();

                if (url) {
                    await WebBrowser.openBrowserAsync(url);
                    // When they return, we assume success or check status?
                    // For MVP, simplistic check:
                    Alert.alert('Payment Processed', 'Check "My Bookings" for status.');
                    onSuccess();
                } else {
                    Alert.alert('Error', 'Could not initiate payment.');
                }

            } catch (e) {
                console.error(e);
                Alert.alert('Error', 'Payment failed');
            }
        }
        setLoading(false);
    };

    return (
        <Modal animationType="slide" visible={true} onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Book {service.name}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionTitle}>Select Time</Text>
                    <View style={styles.slotsGrid}>
                        {availableSlots.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[styles.slot, selectedTime === slot && styles.selectedSlot]}
                                onPress={() => setSelectedTime(slot)}
                            >
                                <Text style={[styles.slotText, selectedTime === slot && styles.selectedSlotText]}>
                                    {slot}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.paymentOptions}>
                        {['cash', 'deposit', 'full'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.paymentOption, paymentType === type && styles.selectedPayment]}
                                onPress={() => setPaymentType(type as any)}
                            >
                                <Text style={[styles.paymentText, paymentType === type && styles.selectedPaymentText]}>
                                    {type === 'deposit' ? '50% Deposit' : type === 'full' ? 'Full Pay' : 'Cash'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.helperText}>
                        {paymentType === 'deposit' && `Pay $${(service.price_cents * 0.5 / 100).toFixed(2)} now.`}
                        {paymentType === 'full' && `Pay $${(service.price_cents / 100).toFixed(2)} now.`}
                        {paymentType === 'cash' && "Pay full amount at the shop."}
                    </Text>

                    <View style={styles.summary}>
                        <Text style={styles.summaryText}>Service: {service.name}</Text>
                        <Text style={styles.summaryText}>Price: ${(service.price_cents / 100).toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.bookButton, !selectedTime && styles.disabledButton]}
                        onPress={handleBook}
                        disabled={!selectedTime || loading}
                    >
                        <Text style={styles.bookButtonText}>{loading ? 'Processing...' : `Confirm & ${paymentType !== 'cash' ? 'Pay' : 'Book'}`}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginTop: 40,
    },
    closeText: {
        color: '#007AFF',
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        marginTop: 16,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    slot: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    selectedSlot: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    slotText: {
        color: '#333',
    },
    selectedSlotText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    paymentOption: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    selectedPayment: {
        borderColor: '#34C759',
        backgroundColor: '#f0fdf4',
    },
    paymentText: {
        fontWeight: '600',
    },
    selectedPaymentText: {
        color: '#15803d',
    },
    helperText: {
        marginTop: 8,
        color: '#666',
        fontStyle: 'italic',
    },
    summary: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    summaryText: {
        fontSize: 16,
        marginBottom: 4,
    },
    bookButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 32,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    bookButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
