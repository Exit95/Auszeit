import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../theme';
import type { RootStackParamList, TabParamList } from '../types';

// Screens — Brennverwaltung
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { OrderFormScreen } from '../screens/OrderFormScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { CustomerDetailScreen } from '../screens/CustomerDetailScreen';
import { CustomerFormScreen } from '../screens/CustomerFormScreen';
import { SearchScreen } from '../screens/SearchScreen';

// Screens — Atelier Admin
import { AtelierHubScreen } from '../screens/AtelierHubScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { InquiriesScreen } from '../screens/InquiriesScreen';
import { InquiryDetailScreen } from '../screens/InquiryDetailScreen';
import { SlotsScreen } from '../screens/SlotsScreen';
import { SlotFormScreen } from '../screens/SlotFormScreen';
import { BookingCreateScreen } from '../screens/BookingCreateScreen';
import { AdminReviewsScreen } from '../screens/AdminReviewsScreen';
import { VoucherScannerScreen } from '../screens/VoucherScannerScreen';
import { VouchersScreen } from '../screens/VouchersScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { BlockedDatesScreen } from '../screens/BlockedDatesScreen';

import { useAuth } from '../hooks/useAuth';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontWeight: '600' as const, color: colors.ink },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Orders: focused ? 'document-text' : 'document-text-outline',
            Customers: focused ? 'people' : 'people-outline',
            Search: focused ? 'search' : 'search-outline',
            Atelier: focused ? 'storefront' : 'storefront-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.meta,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56,
          justifyContent: 'center',
        },
        tabBarLabelStyle: { fontSize: fontSize.xs },
        tabBarIconStyle: { marginTop: 2 },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Übersicht', headerShown: false }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Aufträge', headerShown: false }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: 'Kunden' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Suche' }}
      />
      <Tab.Screen
        name="Atelier"
        component={AtelierHubScreen}
        options={{ title: 'Atelier', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{ title: 'Auftrag' }}
          />
          <Stack.Screen
            name="OrderForm"
            component={OrderFormScreen}
            options={({ route }) => ({
              title: route.params?.id ? 'Auftrag bearbeiten' : 'Neuer Auftrag',
            })}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={{ title: 'Kunde' }}
          />
          <Stack.Screen
            name="CustomerForm"
            component={CustomerFormScreen}
            options={({ route }) => ({
              title: route.params?.id ? 'Kunde bearbeiten' : 'Neuer Kunde',
            })}
          />
          {/* Atelier Admin Screens */}
          <Stack.Screen
            name="AtelierToday"
            component={TodayScreen}
            options={{ title: 'Heute' }}
          />
          <Stack.Screen
            name="AtelierBookings"
            component={BookingsScreen}
            options={{ title: 'Buchungen' }}
          />
          <Stack.Screen
            name="AtelierInquiries"
            component={InquiriesScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="InquiryDetail"
            component={InquiryDetailScreen}
            options={{ title: 'Anfrage' }}
          />
          <Stack.Screen
            name="BookingDetail"
            component={BookingDetailScreen}
            options={{ title: 'Buchung' }}
          />
          <Stack.Screen
            name="AtelierSlots"
            component={SlotsScreen}
            options={{ title: 'Termine' }}
          />
          <Stack.Screen
            name="SlotForm"
            component={SlotFormScreen}
            options={({ route }) => ({
              title: route.params?.id ? 'Termin bearbeiten' : 'Neuer Termin',
            })}
          />
          <Stack.Screen
            name="BookingCreate"
            component={BookingCreateScreen}
            options={{ title: 'Neue Buchung', headerShown: false }}
          />
          <Stack.Screen
            name="BlockedDates"
            component={BlockedDatesScreen}
            options={{ title: 'Urlaub & Sperren', headerShown: false }}
          />
          <Stack.Screen
            name="Stats"
            component={StatsScreen}
            options={{ title: 'Statistiken', headerShown: false }}
          />
          <Stack.Screen
            name="AdminReviews"
            component={AdminReviewsScreen}
            options={{ title: 'Bewertungen' }}
          />
          <Stack.Screen
            name="VoucherScanner"
            component={VoucherScannerScreen}
            options={{ title: 'Gutschein-Scanner', headerShown: false }}
          />
          <Stack.Screen
            name="Vouchers"
            component={VouchersScreen}
            options={{ title: '' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
