import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { supabase } from './lib/supabase';
import { Database } from './types';
import AuthScreen from './screens/AuthScreen';
import CreateProfileScreen from './screens/CreateProfileScreen';
import BookingScreen from './screens/BookingScreen';
import MyBookingsScreen from './screens/MyBookingsScreen';

type Service = Database['public']['Tables']['services']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<'home' | 'booking' | 'myBookings'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchServices();
    }
  }, [session]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setLoading(false);

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setProfile(null);
    });
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('price_cents', { ascending: true });

    if (error) console.error('Error fetching services:', error);
    else setServices(data || []);
    setServicesLoading(false);
  };

  const handleServicePress = (service: Service) => {
    setSelectedService(service);
    setActiveScreen('booking');
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" /></View>
  );

  // 1. Not Logged In
  if (!session) {
    return <AuthScreen onLoginSuccess={() => { }} />;
  }

  // 2. Logged In but No Profile
  if (!profile) {
    // Basic check, might flicker if profile fetch is slow, but fine for MVP
    // Better: add a 'profileLoading' state.
    return <CreateProfileScreen onProfileCreated={fetchProfile} />;
  }

  // 3. Main App Flow
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>RoyCuts</Text>
          <Text style={styles.subtitle}>Welcome, {profile.full_name}</Text>
        </View>
        <TouchableOpacity onPress={() => setActiveScreen('myBookings')}>
          <Text style={styles.linkText}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {servicesLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleServicePress(item)}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.servicePrice}>${(item.price_cents / 100).toFixed(2)}</Text>
                </View>
                <Text style={styles.serviceDuration}>{item.duration_min} mins</Text>
                {item.description && <Text style={styles.serviceDescription}>{item.description}</Text>}
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No services available.</Text>}
        />
      )}

      {/* Booking Modal */}
      {activeScreen === 'booking' && selectedService && (
        <BookingScreen
          service={selectedService}
          userProfile={profile}
          onClose={() => {
            setActiveScreen('home');
            setSelectedService(null);
          }}
          onSuccess={() => {
            setActiveScreen('home');
            setSelectedService(null);
            Alert.alert('Booking requested', 'View it in My Bookings');
          }}
        />
      )}

      {/* My Bookings Modal */}
      {activeScreen === 'myBookings' && (
        <MyBookingsScreen onClose={() => setActiveScreen('home')} />
      )}

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  serviceDuration: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
  signOutButton: {
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: 'red',
  }
});
