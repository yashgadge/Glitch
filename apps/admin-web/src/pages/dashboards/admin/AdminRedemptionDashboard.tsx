import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Package, Utensils, Zap, Users, ShoppingBag } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { motion } from 'framer-motion';

export default function AdminRedemptionDashboard() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRedemptions: 0,
    foodRedemptions: 0,
    swagRedemptions: 0,
    hardwareRedemptions: 0
  });

  useEffect(() => {
    // We only fetch recent redemptions to prevent massive payload sizes in admin view
    const q = query(
      collection(db, 'redemption_records'),
      orderBy('redeemedAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRedemptions(records);
    });

    // Subscriptions for stats (would ideally be aggregated server-side via cloud functions)
    const statsUnsub = onSnapshot(query(collection(db, 'redemption_records')), (snap) => {
      let food = 0;
      let swag = 0;
      let hw = 0;
      snap.forEach(doc => {
        const type = doc.data().entitlementCategory;
        if (type === 'food') food += doc.data().quantityRedeemed || 1;
        else if (type === 'swag') swag += doc.data().quantityRedeemed || 1;
        else if (type === 'hardware') hw += doc.data().quantityRedeemed || 1;
      });
      setStats({
        totalRedemptions: snap.size,
        foodRedemptions: food,
        swagRedemptions: swag,
        hardwareRedemptions: hw
      });
    });

    return () => {
      unsub();
      statsUnsub();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" /> REDEMPTION LOGS
          </h2>
          <p className="font-inter text-gray-400">Live monitoring of entitlement usage across the event.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-primary/10 border-primary/20">
          <p className="text-sm font-inter text-primary-100 mb-1">Total Redemptions</p>
          <h3 className="text-4xl font-bebas text-white tracking-widest">{stats.totalRedemptions}</h3>
        </Card>
        <Card className="p-6 border-white/5 bg-black/20">
          <div className="flex items-center gap-2 mb-1">
            <Utensils className="w-4 h-4 text-orange-400" />
            <p className="text-sm font-inter text-gray-400">Food / Beverage</p>
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-widest">{stats.foodRedemptions}</h3>
        </Card>
        <Card className="p-6 border-white/5 bg-black/20">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-inter text-gray-400">Swag / Merch</p>
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-widest">{stats.swagRedemptions}</h3>
        </Card>
        <Card className="p-6 border-white/5 bg-black/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-inter text-gray-400">Hardware / Access</p>
          </div>
          <h3 className="text-4xl font-bebas text-white tracking-widest">{stats.hardwareRedemptions}</h3>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-black/40">
          <h3 className="font-bebas text-2xl text-white">LATEST ACTIVITY (100)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-inter text-sm">
            <thead className="bg-black/60 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Participant / Team ID</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Location / Volunteer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {redemptions.map((r, i) => (
                <motion.tr 
                  key={r.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                    {new Date(r.redeemedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-300">
                    {r.participantId}
                    {r.teamId && <span className="block text-[10px] text-gray-500">{r.teamId}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-medium block">{r.productNameSnapshot}</span>
                    <span className="text-xs text-gray-500 uppercase">{r.entitlementCategory}</span>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">{r.quantityRedeemed}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {r.locationId || 'Default'}
                    <span className="block text-[10px] text-gray-600 font-mono truncate max-w-[150px]">{r.redeemedBy}</span>
                  </td>
                </motion.tr>
              ))}
              {redemptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No redemption activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
