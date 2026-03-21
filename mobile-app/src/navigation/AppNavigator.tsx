import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../theme';
import type { RootStackParamList, TabParamList } from '../types';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { OrderFormScreen } from '../screens/OrderFormScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { CustomerDetailScreen } from '../screens/CustomerDetailScreen';
import { CustomerFormScreen } from '../screens/CustomerFormScreen';
import { KilnsScreen } from '../screens/KilnsScreen';
import { KilnDetailScreen } from '../screens/KilnDetailScreen';
import { KilnFormScreen } from '../screens/KilnFormScreen';
import { SearchScreen } from '../screens/SearchScreen';

import { useAuth } from '../hooks/useAuth';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
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
            Kilns: focused ? 'flame' : 'flame-outline',
            Search: focused ? 'search' : 'search-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs },
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
        options={{ title: 'Aufträge' }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: 'Kunden' }}
      />
      <Tab.Screen
        name="Kilns"
        component={KilnsScreen}
        options={{ title: 'Öfen' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Suche' }}
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
          <Stack.Screen
            name="KilnDetail"
            component={KilnDetailScreen}
            options={{ title: 'Ofen' }}
          />
          <Stack.Screen
            name="KilnForm"
            component={KilnFormScreen}
            options={({ route }) => ({
              title: route.params?.id ? 'Ofen bearbeiten' : 'Neuer Ofen',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
