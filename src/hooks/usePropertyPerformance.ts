import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyPerformance {
  property_id: string;
  property_name: string;
  occupancy_rate: number;
  estimated_revenue: number;
  missions_count: number;
  next_checkout: string | null;
  next_checkin: string | null;
}

export function usePropertyPerformance(startDate: string, endDate: string) {
  const [data, setData] = useState<PropertyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalMetrics, setGlobalMetrics] = useState({
    total_occupancy: 0,
    total_revenue: 0,
    total_missions: 0,
    total_properties: 0,
  });

  const calculate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    // Fetch properties
    const { data: properties } = await supabase
      .from("properties")
      .select("id, name")
      .eq("user_id", user.id);

    if (!properties || properties.length === 0) {
      setLoading(false);
      return;
    }

    const propertyIds = properties.map(p => p.id);

    // Fetch bookings for the period
    const { data: bookings } = await (supabase as any)
      .from("bookings")
      .select("property_id, check_in, check_out, gross_amount")
      .eq("user_id", user.id)
      .in("property_id", propertyIds)
      .gte("check_out", startDate)
      .lte("check_in", endDate);

    // Fetch calendar events for the period
    const { data: events } = await (supabase as any)
      .from("calendar_events")
      .select("property_id, start_date, end_date, event_type")
      .eq("user_id", user.id)
      .in("property_id", propertyIds)
      .gte("end_date", startDate)
      .lte("start_date", endDate);

    // Fetch missions
    const { data: missions } = await (supabase as any)
      .from("missions")
      .select("property_id")
      .eq("user_id", user.id)
      .in("property_id", propertyIds)
      .gte("start_at", startDate)
      .lte("start_at", endDate);

    // Calculate metrics per property
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const performanceData: PropertyPerformance[] = properties.map(prop => {
      const propBookings = (bookings || []).filter(b => b.property_id === prop.id);
      const propEvents = (events || []).filter(e => e.property_id === prop.id && e.event_type === 'reservation');
      const propMissions = (missions || []).filter(m => m.property_id === prop.id);

      // Calculate booked days from bookings + events
      let bookedDays = 0;
      const allReservations = [
        ...propBookings.map(b => ({ start: b.check_in, end: b.check_out })),
        ...propEvents.map(e => ({ start: e.start_date, end: e.end_date })),
      ];

      allReservations.forEach(res => {
        const resStart = new Date(res.start);
        const resEnd = new Date(res.end);
        const overlapStart = resStart > start ? resStart : start;
        const overlapEnd = resEnd < end ? resEnd : end;
        if (overlapEnd > overlapStart) {
          bookedDays += Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        }
      });

      const occupancyRate = totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;
      const revenue = propBookings.reduce((sum, b) => sum + (b.gross_amount || 0), 0);

      // Find next checkout
      const upcomingCheckouts = propBookings
        .filter(b => new Date(b.check_out) > new Date())
        .sort((a, b) => new Date(a.check_out).getTime() - new Date(b.check_out).getTime());

      const upcomingCheckins = propBookings
        .filter(b => new Date(b.check_in) > new Date())
        .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

      return {
        property_id: prop.id,
        property_name: prop.name,
        occupancy_rate: occupancyRate,
        estimated_revenue: revenue,
        missions_count: propMissions.length,
        next_checkout: upcomingCheckouts[0]?.check_out || null,
        next_checkin: upcomingCheckins[0]?.check_in || null,
      };
    });

    // Calculate global metrics
    const totalOccupancy = performanceData.reduce((sum, p) => sum + p.occupancy_rate, 0) / performanceData.length || 0;
    const totalRevenue = performanceData.reduce((sum, p) => sum + p.estimated_revenue, 0);
    const totalMissions = performanceData.reduce((sum, p) => sum + p.missions_count, 0);

    setData(performanceData);
    setGlobalMetrics({
      total_occupancy: totalOccupancy,
      total_revenue: totalRevenue,
      total_missions: totalMissions,
      total_properties: properties.length,
    });

    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return { data, loading, globalMetrics, refetch: calculate };
}
