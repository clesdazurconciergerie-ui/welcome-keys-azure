import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Property } from "@/hooks/useProperties";
import type { CleaningIntervention } from "@/hooks/useCleaningInterventions";
import type { NewMission } from "@/hooks/useNewMissions";
import type { Inspection } from "@/hooks/useInspections";
import type { Prospect } from "@/hooks/useProspects";
import type { Booking } from "@/hooks/useBookings";
import { toast } from "sonner";

// ── Demo data ──────────────────────────────────

const DEMO_PROPERTY_1_ID = "demo-prop-001";
const DEMO_PROPERTY_2_ID = "demo-prop-002";

const DEMO_PROPERTIES: Property[] = [
  {
    id: DEMO_PROPERTY_1_ID,
    user_id: "demo-user",
    name: "Villa La Palmeraie",
    address: "24 Chemin des Oliviers",
    city: "Nice",
    postcode: "06000",
    country: "France",
    surface_m2: 120,
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    property_type: "villa",
    avg_nightly_rate: 180,
    pricing_strategy: null,
    photos: [],
    amenities: [],
    notes: null,
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: DEMO_PROPERTY_2_ID,
    user_id: "demo-user",
    name: "Les Jardins de Géolia",
    address: "8 Avenue des Fleurs",
    city: "Cannes",
    postcode: "06400",
    country: "France",
    surface_m2: 85,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    property_type: "apartment",
    avg_nightly_rate: 130,
    pricing_strategy: null,
    photos: [],
    amenities: [],
    notes: null,
    status: "active",
    created_at: "2025-02-20T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
  },
];

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const DEMO_INTERVENTIONS: CleaningIntervention[] = [
  {
    id: "demo-int-001",
    property_id: DEMO_PROPERTY_1_ID,
    service_provider_id: "demo-sp-001",
    concierge_user_id: "demo-user",
    scheduled_date: fmt(today),
    scheduled_start_time: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0)),
    scheduled_end_time: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0)),
    actual_start_time: null,
    actual_end_time: null,
    completed_at: null,
    status: "in_progress",
    type: "cleaning",
    mission_type: "cleaning",
    notes: null,
    concierge_notes: null,
    admin_comment: null,
    provider_comment: null,
    checklist_validated: false,
    internal_score: null,
    punctuality_score: null,
    mission_amount: 85,
    payment_done: false,
    created_at: fmt(addDays(today, -1)),
    updated_at: fmt(today),
    property: { name: "Villa La Palmeraie", address: "24 Chemin des Oliviers" },
    service_provider: { first_name: "Sophie", last_name: "Dupont", email: "sophie@demo.com", phone: null, score_global: 4.8 },
  },
  {
    id: "demo-int-002",
    property_id: DEMO_PROPERTY_2_ID,
    service_provider_id: "demo-sp-002",
    concierge_user_id: "demo-user",
    scheduled_date: fmt(today),
    scheduled_start_time: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0)),
    scheduled_end_time: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30)),
    actual_start_time: null,
    actual_end_time: null,
    completed_at: null,
    status: "scheduled",
    type: "cleaning",
    mission_type: "checkin",
    notes: "Accueil voyageurs — famille Garcia",
    concierge_notes: null,
    admin_comment: null,
    provider_comment: null,
    checklist_validated: false,
    internal_score: null,
    punctuality_score: null,
    mission_amount: 60,
    payment_done: false,
    created_at: fmt(addDays(today, -2)),
    updated_at: fmt(today),
    property: { name: "Les Jardins de Géolia", address: "8 Avenue des Fleurs" },
    service_provider: { first_name: "Julien", last_name: "Martin", email: "julien@demo.com", phone: null, score_global: 4.5 },
  },
];

const DEMO_MISSIONS: NewMission[] = [
  {
    id: "demo-mis-001",
    user_id: "demo-user",
    property_id: DEMO_PROPERTY_1_ID,
    mission_type: "cleaning_checkout",
    title: "Ménage (check-out) — Villa La Palmeraie",
    instructions: "Nettoyage complet + changement draps",
    start_at: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0)),
    end_at: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0)),
    duration_minutes: 120,
    payout_amount: 85,
    status: "confirmed",
    selected_provider_id: "demo-sp-001",
    created_at: fmt(addDays(today, -3)),
    updated_at: fmt(today),
    property: { name: "Villa La Palmeraie", address: "24 Chemin des Oliviers" },
    selected_provider: { first_name: "Sophie", last_name: "Dupont", email: "sophie@demo.com", phone: null },
  },
  {
    id: "demo-mis-002",
    user_id: "demo-user",
    property_id: DEMO_PROPERTY_2_ID,
    mission_type: "checkin",
    title: "Accueil voyageurs — Les Jardins de Géolia",
    instructions: "Remise des clés + visite",
    start_at: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0)),
    end_at: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0)),
    duration_minutes: 60,
    payout_amount: 40,
    status: "draft",
    selected_provider_id: "demo-sp-002",
    created_at: fmt(addDays(today, -2)),
    updated_at: fmt(today),
    property: { name: "Les Jardins de Géolia", address: "8 Avenue des Fleurs" },
    selected_provider: { first_name: "Julien", last_name: "Martin", email: "julien@demo.com", phone: null },
  },
  {
    id: "demo-mis-003",
    user_id: "demo-user",
    property_id: DEMO_PROPERTY_1_ID,
    mission_type: "cleaning_checkout",
    title: "Ménage (check-out) — Villa La Palmeraie",
    instructions: null,
    start_at: fmt(addDays(today, 2)),
    end_at: null,
    duration_minutes: 120,
    payout_amount: 85,
    status: "open",
    selected_provider_id: null,
    created_at: fmt(today),
    updated_at: fmt(today),
    property: { name: "Villa La Palmeraie", address: "24 Chemin des Oliviers" },
  },
];

const DEMO_INSPECTIONS: Inspection[] = [
  {
    id: "demo-insp-001",
    user_id: "demo-user",
    property_id: DEMO_PROPERTY_1_ID,
    booking_id: null,
    linked_inspection_id: null,
    cleaning_intervention_id: null,
    cleaner_name: "Sophie Dupont",
    inspection_type: "entry",
    guest_name: "Jean Dupont",
    inspection_date: fmt(addDays(today, -5)),
    occupants_count: 4,
    meter_electricity: "12450",
    meter_water: "345",
    meter_gas: null,
    general_comment: "Logement en bon état.",
    damage_notes: null,
    cleaning_photos_json: [],
    exit_photos_json: [],
    concierge_signature_url: null,
    guest_signature_url: null,
    pdf_url: null,
    status: "completed",
    created_at: fmt(addDays(today, -5)),
    updated_at: fmt(addDays(today, -5)),
    property: { name: "Villa La Palmeraie", address: "24 Chemin des Oliviers" },
  },
  {
    id: "demo-insp-002",
    user_id: "demo-user",
    property_id: DEMO_PROPERTY_2_ID,
    booking_id: null,
    linked_inspection_id: null,
    cleaning_intervention_id: null,
    cleaner_name: null,
    inspection_type: "exit",
    guest_name: "Sarah Martin",
    inspection_date: fmt(addDays(today, -1)),
    occupants_count: 2,
    meter_electricity: "8920",
    meter_water: "210",
    meter_gas: null,
    general_comment: null,
    damage_notes: "Petite rayure sur la table du salon.",
    cleaning_photos_json: [],
    exit_photos_json: [],
    concierge_signature_url: null,
    guest_signature_url: null,
    pdf_url: null,
    status: "draft",
    created_at: fmt(addDays(today, -1)),
    updated_at: fmt(addDays(today, -1)),
    property: { name: "Les Jardins de Géolia", address: "8 Avenue des Fleurs" },
  },
];

const DEMO_PROSPECTS: Prospect[] = [
  {
    id: "demo-prospect-001",
    user_id: "demo-user",
    first_name: "Laurent",
    last_name: "Moreau",
    phone: null,
    email: "laurent@demo.com",
    property_address: "15 Rue de la Liberté",
    city: "Antibes",
    property_type: "apartment",
    estimated_monthly_revenue: 2400,
    pipeline_status: "interested",
    source: "outbound_call",
    warmth: "hot",
    first_contact_date: fmt(addDays(today, -10)),
    last_contact_date: fmt(addDays(today, -2)),
    score: 75,
    internal_notes: "Très intéressé par la gestion complète.",
    converted_owner_id: null,
    created_at: fmt(addDays(today, -10)),
    updated_at: fmt(addDays(today, -2)),
  },
  {
    id: "demo-prospect-002",
    user_id: "demo-user",
    first_name: "Marie",
    last_name: "Leroy",
    phone: null,
    email: "marie@demo.com",
    property_address: "42 Boulevard Carnot",
    city: "Nice",
    property_type: "villa",
    estimated_monthly_revenue: 3800,
    pipeline_status: "meeting_scheduled",
    source: "referral",
    warmth: "warm",
    first_contact_date: fmt(addDays(today, -7)),
    last_contact_date: fmt(addDays(today, -1)),
    score: 60,
    internal_notes: null,
    converted_owner_id: null,
    created_at: fmt(addDays(today, -7)),
    updated_at: fmt(addDays(today, -1)),
  },
  {
    id: "demo-prospect-003",
    user_id: "demo-user",
    first_name: "David",
    last_name: "Moutier",
    phone: null,
    email: null,
    property_address: "3 Chemin des Crêtes",
    city: "Agay",
    property_type: "villa",
    estimated_monthly_revenue: 1800,
    pipeline_status: "new_contact",
    source: "inbound",
    warmth: "cold",
    first_contact_date: null,
    last_contact_date: null,
    score: 20,
    internal_notes: null,
    converted_owner_id: null,
    created_at: fmt(addDays(today, -1)),
    updated_at: fmt(addDays(today, -1)),
  },
];

const DEMO_BOOKINGS: Booking[] = [
  {
    id: "demo-book-001",
    property_id: DEMO_PROPERTY_1_ID,
    user_id: "demo-user",
    check_in: fmt(addDays(today, -2)),
    check_out: fmt(today),
    source: "airbnb",
    source_platform: "airbnb",
    is_manual: false,
    guest_name: "Jean Dupont",
    guest_email: null,
    guest_phone: null,
    gross_amount: 720,
    commission_amount: 108,
    cleaning_amount: 85,
    checkin_amount: 0,
    maintenance_amount: 0,
    other_deductions: 0,
    owner_net: 527,
    concierge_revenue: 193,
    price_status: "complete",
    financial_status: "confirmed",
    notes: null,
    calendar_event_id: null,
    created_at: fmt(addDays(today, -10)),
    property: { name: "Villa La Palmeraie" },
  },
  {
    id: "demo-book-002",
    property_id: DEMO_PROPERTY_2_ID,
    user_id: "demo-user",
    check_in: fmt(addDays(today, 1)),
    check_out: fmt(addDays(today, 5)),
    source: "booking",
    source_platform: "booking",
    is_manual: false,
    guest_name: "Famille Garcia",
    guest_email: null,
    guest_phone: null,
    gross_amount: 520,
    commission_amount: 78,
    cleaning_amount: 60,
    checkin_amount: 0,
    maintenance_amount: 0,
    other_deductions: 0,
    owner_net: 382,
    concierge_revenue: 138,
    price_status: "complete",
    financial_status: "pending",
    notes: null,
    calendar_event_id: null,
    created_at: fmt(addDays(today, -5)),
    property: { name: "Les Jardins de Géolia" },
  },
];

// ── Context ──────────────────────────────────

interface DemoContextValue {
  isDemoMode: boolean;
  demoProperties: Property[];
  demoInterventions: CleaningIntervention[];
  demoMissions: NewMission[];
  demoInspections: Inspection[];
  demoProspects: Prospect[];
  demoBookings: Booking[];
  demoUserName: string;
  demoBookletCount: number;
  blockAction: () => void;
  // Demo tour
  tourStep: number;
  tourActive: boolean;
  totalTourSteps: number;
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  skipTour: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoContext() {
  return useContext(DemoContext);
}

export function useIsDemoMode() {
  const ctx = useContext(DemoContext);
  return ctx?.isDemoMode ?? false;
}

export function useDemoAction() {
  const ctx = useContext(DemoContext);
  return {
    isDemoMode: ctx?.isDemoMode ?? false,
    blockAction: ctx?.blockAction ?? (() => {}),
  };
}

// ── Tour Steps ──────────────────────────────────

export const DEMO_TOUR_STEPS = [
  {
    id: "dashboard",
    route: "/demo",
    title: "Tableau de bord",
    explanation: "Vue d'ensemble en temps réel : missions, réservations, indicateurs clés.",
    useCase: "Chaque matin, priorisez vos actions de la journée.",
    icon: "layout-dashboard",
  },
  {
    id: "logements",
    route: "/demo/logements",
    title: "Gestion des logements",
    explanation: "Centralisez vos biens : calendriers iCal, paramètres ménage, propriétaires.",
    useCase: "Ajoutez un bien et connectez son calendrier Airbnb.",
    icon: "home",
  },
  {
    id: "missions",
    route: "/demo/missions",
    title: "Missions & prestataires",
    explanation: "Planifiez les missions de ménage, check-in et interventions techniques.",
    useCase: "Les missions se créent automatiquement à chaque réservation.",
    icon: "briefcase",
  },
  {
    id: "inspections",
    route: "/demo/etats-des-lieux",
    title: "États des lieux",
    explanation: "Documentez entrées et sorties avec photos, compteurs, signatures et PDF.",
    useCase: "Générez un PDF professionnel signé en quelques minutes.",
    icon: "clipboard-check",
  },
  {
    id: "livrets",
    route: "/demo/livrets",
    title: "Livrets d'accueil digitaux",
    explanation: "Créez des livrets personnalisés : infos pratiques, WiFi, règles, activités.",
    useCase: "Envoyez un lien unique à vos voyageurs avant leur arrivée.",
    icon: "book-open",
  },
  {
    id: "finance",
    route: "/demo/finance",
    title: "Pilotage financier",
    explanation: "Factures propriétaires, suivi des dépenses, paiements prestataires centralisés.",
    useCase: "Générez une facture en un clic à partir des réservations du mois.",
    icon: "euro",
  },
  {
    id: "prospection",
    route: "/demo/prospection",
    title: "CRM & Prospection",
    explanation: "Pipeline commercial, suivi prospects, relances automatiques.",
    useCase: "Convertissez vos prospects en propriétaires actifs.",
    icon: "target",
  },
];

// ── Provider ──────────────────────────────────

export function DemoProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [tourStep, setTourStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);

  const blockAction = useCallback(() => {
    toast("Créez votre compte pour utiliser cette fonctionnalité.", {
      action: {
        label: "Créer mon compte",
        onClick: () => navigate("/auth"),
      },
    });
  }, [navigate]);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
    navigate(DEMO_TOUR_STEPS[0].route);
  }, [navigate]);

  const nextTourStep = useCallback(() => {
    const next = tourStep + 1;
    if (next >= DEMO_TOUR_STEPS.length) {
      setTourActive(false);
      return;
    }
    setTourStep(next);
    navigate(DEMO_TOUR_STEPS[next].route);
  }, [tourStep, navigate]);

  const prevTourStep = useCallback(() => {
    if (tourStep <= 0) return;
    const prev = tourStep - 1;
    setTourStep(prev);
    navigate(DEMO_TOUR_STEPS[prev].route);
  }, [tourStep, navigate]);

  const skipTour = useCallback(() => {
    setTourActive(false);
  }, []);

  const value: DemoContextValue = {
    isDemoMode: true,
    demoProperties: DEMO_PROPERTIES,
    demoInterventions: DEMO_INTERVENTIONS,
    demoMissions: DEMO_MISSIONS,
    demoInspections: DEMO_INSPECTIONS,
    demoProspects: DEMO_PROSPECTS,
    demoBookings: DEMO_BOOKINGS,
    demoUserName: "Marie",
    demoBookletCount: 2,
    blockAction,
    tourStep,
    tourActive,
    totalTourSteps: DEMO_TOUR_STEPS.length,
    startTour,
    nextTourStep,
    prevTourStep,
    skipTour,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
