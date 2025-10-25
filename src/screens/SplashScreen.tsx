import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const run = async () => {
      try {
        const user = auth().currentUser;
        if (user) {
          await runMaintenance(user.uid);
        }
      } catch (e) {
        // Avoid blocking navigation on error
        console.log('Maintenance error:', e);
      } finally {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }
    };
    run();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/splash.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default SplashScreen;

// ------------- Maintenance Logic -------------

const getMonday = (d: Date): Date => {
  const c = new Date(d);
  const day = c.getDay();
  const diff = c.getDate() - day + (day === 0 ? -6 : 1);
  c.setDate(diff);
  c.setHours(0, 0, 0, 0);
  return c;
};

const yyyymmdd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dayKeyFromDate = (date: Date): string => {
  // Map 0..6 => ['dimanche','lundi',...]
  const fr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return fr[date.getDay()];
};

const startOfMonth = (d: Date) => {
  const c = new Date(d);
  c.setDate(1);
  c.setHours(0, 0, 0, 0);
  return c;
};

async function runMaintenance(uid: string) {
  const maintenanceRef = firestore()
    .collection('users')
    .doc(uid)
    .collection('meta')
    .doc('maintenance');

  const snap = await maintenanceRef.get();
  const data = snap.data() || {};
  const lastProcessedDateStr: string | undefined = data.lastProcessedDate; // format YYYY-MM-DD
  const lastMonthCleared: string | undefined = data.lastMonthCleared; // format YYYY-MM

  // Backfill from the day after lastProcessedDate up to yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  let startDate: Date | null = null;
  if (lastProcessedDateStr) {
    const [Y, M, D] = lastProcessedDateStr.split('-').map((n: string) => parseInt(n, 10));
    const last = new Date(Y, M - 1, D);
    last.setDate(last.getDate() + 1); // next day after last processed
    startDate = last;
  } else {
    // First run: process only yesterday (not entire history)
    startDate = new Date(yesterday);
  }

  if (startDate && startDate <= yesterday) {
    const cur = new Date(startDate);
    while (cur <= yesterday) {
      await backfillDay(uid, cur);
      cur.setDate(cur.getDate() + 1);
    }
    // Update lastProcessedDate to yesterday
    await maintenanceRef.set({ lastProcessedDate: yyyymmdd(yesterday) }, { merge: true });
  }

  // Monthly clear: keep only current month
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (lastMonthCleared !== ym) {
    await clearHistoryBefore(uid, startOfMonth(today));
    await maintenanceRef.set({ lastMonthCleared: ym }, { merge: true });
  }
}

async function backfillDay(uid: string, date: Date) {
  // Find meal plan doc for the week and push that day's meals to history
  const monday = getMonday(date);
  const docId = yyyymmdd(monday);
  const dayKey = dayKeyFromDate(date); // matches keys used in MealPlannerScreen (lowercase french days)

  const mealDoc = await firestore()
    .collection('users')
    .doc(uid)
    .collection('mealPlans')
    .doc(docId)
    .get();
  const planData = mealDoc.data() as any;
  if (!planData || !planData.plan) return;

  const dayPlan = planData.plan[dayKey];
  if (!dayPlan) return;

  const entries: Array<{ name?: string; id?: string }> = [
    { name: dayPlan.morningPlatName, id: dayPlan.morningPlatId },
    { name: dayPlan.noonPlatName, id: dayPlan.noonPlatId },
    { name: dayPlan.eveningPlatName, id: dayPlan.eveningPlatId },
  ];

  // Use typical times for meals
  const times = [9, 13, 20];
  const batch = firestore().batch();
  const col = firestore().collection('users').doc(uid).collection('repasHistorique');

  entries.forEach((e, idx) => {
    if (!e?.name) return;
    const when = new Date(date);
    when.setHours(times[idx] || 12, 0, 0, 0);
    const ref = col.doc();
    batch.set(ref, {
      platId: e.id || '',
      nomPlat: e.name,
      datePreparation: firestore.Timestamp.fromDate(when),
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}

async function clearHistoryBefore(uid: string, cutoff: Date) {
  // Delete repasHistorique documents where datePreparation < cutoff
  const col = firestore().collection('users').doc(uid).collection('repasHistorique');
  const snap = await col.where('datePreparation', '<', firestore.Timestamp.fromDate(cutoff)).get();
  if (snap.empty) return;
  const batch = firestore().batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
