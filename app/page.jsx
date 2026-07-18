"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { FAKHAMA_LOGO_BLACK_BASE64, FAKHAMA_LOGO_BROWN_BASE64, FAKHAMA_QR_BASE64, FACTURE_FRAME_BASE64, FAKHAMA_FRAME_BASE64 } from "../lib/assets";
import { supabase } from "../lib/supabaseClient";
import { bookingToRow, rowToBooking, maintenanceToRow, rowToMaintenance, assuranceToRow, rowToAssurance, vignetteToRow, rowToVignette, carburantToRow, rowToCarburant } from "../lib/mappers";
import { SUPPLEMENT_RETOUR, ACOMPTE_PERCENTAGE, PAIEMENT_STATUSES, DECORATION_OPTIONS, maintenancePlan } from "../lib/constants";
import { formatBookingItineraire, timeToMinutes, formatCurrency, getMonthName, paiementVariant, calculateShootingCost, calculateTotalPrice, calculateAcompte } from "../lib/calculations";
import Badge from "../components/Badge";
import Notification from "../components/Notification";
import ConfirmModal from "../components/ConfirmModal";
import Sidebar from "../components/Sidebar";
import KpiCard from "../components/KpiCard";
import AllReminders from "../components/AllReminders";
import WhatsAppButton from "../components/WhatsAppButton";
import ViewModeToggle from "../components/ViewModeToggle";
import BookingCard from "../components/BookingCard";
import MultiStopSelector from "../components/MultiStopSelector";
import AnnualSummaryChart from "../components/AnnualSummaryChart";
import ReservationsVsTarget from "../components/ReservationsVsTarget";
import RevenueByCity from "../components/RevenueByCity";
import LoginForm from "../components/LoginForm";
import PriceSimulation from "../components/PriceSimulation";
import CalendarView from "../components/CalendarView";
import AdvancedStats from "../components/AdvancedStats";
import RealTimeStats from "../components/RealTimeStats";

export default function CarRentalManagement() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [assurances, setAssurances] = useState([]);
  const [vignettes, setVignettes] = useState([]);
  const [carburants, setCarburants] = useState([]);
  const [editBooking, setEditBooking] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filter, setFilter] = useState({});
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveDateFrom, setArchiveDateFrom] = useState("");
  const [archiveDateTo, setArchiveDateTo] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  // Affichage tableau (desktop) ou liste de cartes (mobile) — choix manuel de l'utilisateur.
  // Affichage tableau (desktop) ou liste de cartes (mobile) — auto sur mobile, modifiable ensuite.
  const [reservationsView, setReservationsView] = useState(
    typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "table"
  );
  const [showReservationsCalendar, setShowReservationsCalendar] = useState(false);
  const [archiveView, setArchiveView] = useState(typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "table");
  const [activeTab, setActiveTab] = useState("simulation");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDayBookings, setSelectedDayBookings] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [draftBooking, setDraftBooking] = useState(null);
  const autoSaveTimer = useRef(null);

  // Pagination réservations & archive
  const [currentPage, setCurrentPage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const itemsPerPage = 10;

  const [newBookingStops, setNewBookingStops] = useState(["Tunis"]);
  const [editBookingStops, setEditBookingStops] = useState(["Tunis"]);

  const [newBooking, setNewBooking] = useState({
    // Par défaut, une nouvelle réservation est un devis "En attente" de confirmation
    // du client. On la fait basculer manuellement en "Avance" ou "Payé" une fois
    // le client confirmé.
    client: "", phone: "", date: "", heure: "20:00",
    retour: false, paiement: "En attente", avance: "",
    lieuMarie: "", lieuMariee: "", salleFetes: "", lieuRetour: "", lieuShooting: "", decoration: "rubans-fleurs", commentaires: "",
    shooting: false, shootingHeures: 1
  });

  const [newMaintenance, setNewMaintenance] = useState({
    date: new Date().toISOString().split("T")[0], kilometrage: "", type: "", description: "", cout: ""
  });
  const [newAssurance, setNewAssurance] = useState({
    dateDebut: "", dateFin: "", compagnie: "", cout: "", numeroContrat: ""
  });
  const [newVignette, setNewVignette] = useState({
    annee: new Date().getFullYear(), cout: "", datePaiement: new Date().toISOString().split("T")[0]
  });
  const [newCarburant, setNewCarburant] = useState({
    date: new Date().toISOString().split("T")[0], quantite: "", prixLitre: "", kilometrage: "", station: ""
  });

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const [b, m, a, v, c] = await Promise.all([
        supabase.from("bookings").select("*").order("date", { ascending: false }),
        supabase.from("maintenances").select("*").order("date", { ascending: false }),
        supabase.from("assurances").select("*").order("date_fin", { ascending: false }),
        supabase.from("vignettes").select("*").order("annee", { ascending: false }),
        supabase.from("carburants").select("*").order("date", { ascending: false }),
      ]);
      if (b.error) throw b.error;
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      if (v.error) throw v.error;
      if (c.error) throw c.error;
      setBookings((b.data || []).map(rowToBooking));
      setMaintenances((m.data || []).map(rowToMaintenance));
      setAssurances((a.data || []).map(rowToAssurance));
      setVignettes((v.data || []).map(rowToVignette));
      setCarburants((c.data || []).map(rowToCarburant));
    } catch (err) {
      console.error(err);
      setDataError("Impossible de charger les données depuis Supabase. Vérifiez la connexion et la configuration (URL/clé).");
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Restaure la session Supabase Auth côté client au montage
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthenticated(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime — synchronisation multi-appareil en temps réel ──────────────────
  // Écoute les INSERT/UPDATE/DELETE sur la table bookings et met à jour le state
  // React automatiquement, sans recharger la page.
  useEffect(() => {
    if (!authenticated) return;
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        const newRow = rowToBooking(payload.new);
        setBookings((prev) => prev.some((b) => b.id === newRow.id) ? prev : [...prev, newRow]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, (payload) => {
        const updated = rowToBooking(payload.new);
        setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "bookings" }, (payload) => {
        setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    loadAllData();
    const savedDraft = localStorage.getItem("fakhama-draft");
    if (savedDraft) setDraftBooking(JSON.parse(savedDraft));
  }, [authenticated, loadAllData]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (newBooking.client || newBooking.date || newBooking.salleFetes) {
        localStorage.setItem("fakhama-draft", JSON.stringify({ ...newBooking, stops: newBookingStops }));
        showNotification("Brouillon sauvegardé automatiquement", "info");
      }
    }, 3000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [newBooking, newBookingStops]);

  // Auto-remplissage de l'avance : dès que l'itinéraire, le retour ou le
  // shooting changent alors que le statut "Avance" est sélectionné, on
  // recalcule automatiquement le montant de l'acompte (30% du prix total).
  useEffect(() => {
    if (newBooking.paiement === "Avance") {
      const { prix } = calculateTotalPrice(
        newBookingStops,
        newBooking.retour,
        newBooking.shooting ? newBooking.shootingHeures : 0
      );
      const acompte = calculateAcompte(prix);
      setNewBooking((prev) =>
        prev.paiement === "Avance" && prev.avance !== acompte ? { ...prev, avance: acompte } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBookingStops, newBooking.retour, newBooking.shooting, newBooking.shootingHeures, newBooking.paiement]);

  // Même logique pour le formulaire de modification d'une réservation existante.
  useEffect(() => {
    if (editBooking && editBooking.paiement === "Avance") {
      const { prix } = calculateTotalPrice(
        editBookingStops,
        editBooking.retour,
        editBooking.shooting ? editBooking.shootingHeures : 0
      );
      const acompte = calculateAcompte(prix);
      setEditBooking((prev) =>
        prev && prev.paiement === "Avance" && prev.avance !== acompte ? { ...prev, avance: acompte } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBookingStops, editBooking?.retour, editBooking?.shooting, editBooking?.shootingHeures, editBooking?.paiement]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setActiveTab("reservations");
        showNotification("Nouvelle réservation - Formulaire prêt", "success");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editBooking) handleSaveEdit();
        else if (activeTab === "reservations") handleAddBooking();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editBooking, newBooking, newBookingStops, activeTab]);

  // Réinitialise la pagination dès que les filtres ou la recherche changent,
  // pour éviter d'atterrir sur une page vide.
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const showNotification = (message, type = "info") => setNotification({ message, type });

  const calculatePrice = useCallback((stops, retour, shootingHeures = 0) => {
    return calculateTotalPrice(stops, retour, shootingHeures);
  }, []);

  const calculateRest = (prix, avance, paiement) => {
    if (paiement === "Payé") return 0;
    if (paiement === "Non payé") return prix;
    return Math.max(0, prix - avance);
  };

  const validateField = (field, value) => {
    const errors = {};
    switch (field) {
      case "client":
        if (!value.trim()) errors.client = "Le nom du client est requis";
        else if (value.trim().length < 2) errors.client = "Minimum 2 caractères";
        break;
      case "date":
        if (!value) errors.date = "La date est requise";
        else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) errors.date = "La date ne peut pas être dans le passé";
        }
        break;
      case "heure":
        if (!value) errors.heure = "L'heure est requise";
        break;
      case "avance":
        if (value < 0) errors.avance = "L'avance ne peut pas être négative";
        if (value > 10000) errors.avance = "Avance trop élevée";
        break;
      case "phone":
        if (value && !/^[0-9+\s]{8,15}$/.test(value)) errors.phone = "Format téléphone invalide";
        break;
    }
    return errors;
  };

  const validateBookingComplete = (booking, stops) => {
    const errors = {};
    if (!booking.client.trim()) errors.client = "Le nom du client est requis";
    if (!booking.date) errors.date = "La date est requise";
    if (!booking.heure) errors.heure = "L'heure est requise";
    if (booking.avance < 0) errors.avance = "L'avance ne peut pas être négative";
    const isDuplicate = bookings.some(
      (b) => b.id !== booking.id && b.date === booking.date && b.heure === booking.heure
    );
    if (isDuplicate) errors.duplicate = "Cette date et heure est déjà réservée";
    return errors;
  };

  const handleFieldChange = (field, value) => {
    setNewBooking((prev) => ({ ...prev, [field]: value }));
    const errors = validateField(field, value);
    setValidationErrors((prev) => {
      const next = { ...prev, ...errors };
      if (!errors[field]) delete next[field];
      return next;
    });
  };

  // Change le statut de paiement d'une nouvelle réservation. Si le statut passe à
  // "Avance", calcule automatiquement 30% du prix total comme montant d'acompte.
  const handleNewBookingPaiementChange = (value) => {
    setNewBooking((prev) => {
      const updated = { ...prev, paiement: value };
      if (value === "Avance") {
        const { prix } = calculateTotalPrice(newBookingStops, prev.retour, prev.shooting ? prev.shootingHeures : 0);
        updated.avance = calculateAcompte(prix);
      }
      return updated;
    });
  };

  // Idem pour l'édition d'une réservation existante.
  const handleEditBookingPaiementChange = (value) => {
    setEditBooking((prev) => {
      const updated = { ...prev, paiement: value };
      if (value === "Avance") {
        const { prix } = calculateTotalPrice(editBookingStops, prev.retour, prev.shooting ? prev.shootingHeures : 0);
        updated.avance = calculateAcompte(prix);
      }
      return updated;
    });
  };

  // ── Facture évènement — format A4, imprimable directement ────────────────────
  // TODO (facture PDF réelle) : cette fonction génère un fichier .html téléchargeable
  // et imprimable depuis le navigateur (fonctionne partout, sans dépendance). Pour un
  // vrai fichier PDF généré côté serveur : Supabase Edge Function + Puppeteer, ou
  // jsPDF côté client (npm install jspdf, puis construire le PDF programmatiquement
  // plutôt que via du HTML).
  //
  // documentType: "facture" (par défaut) ou "devis". Depuis la refonte, le devis a
  // son propre gabarit minimaliste (façon carte de visite / invoice moderne, noir &
  // blanc) totalement distinct de la facture qui garde son habillage "carton
  // d'invitation" doré. Les deux affichent désormais le logo Fakhama ainsi que le
  // QR code de la page Facebook.
  // Génère un numéro séquentiel lisible : FAC-2026-001 / DEV-2026-001
  // Basé sur le rang de la réservation parmi toutes les réservations triées par date croissante.
  const getDocNumber = (booking, type = "FAC") => {
    const year = new Date(booking.date).getFullYear() || new Date().getFullYear();
    const sorted = [...bookings].sort((a, b) => new Date(a.date) - new Date(b.date));
    const rank = sorted.findIndex((b) => b.id === booking.id) + 1;
    return `${type}-${year}-${String(rank).padStart(3, "0")}`;
  };

  const generateInvoiceEvenementPDF = (booking, documentType = "facture") => {
    const isDevis = documentType === "devis";
    const docNum = getDocNumber(booking, isDevis ? "DEV" : "FAC");
    if (isDevis) {
      return generateDevisHTML(booking, docNum);
    } else {
      return generateFactureHTML(booking, docNum);
    }
  };

  // ── DEVIS — gabarit minimaliste noir & blanc (façon "invoice" épurée) ────────
  const generateDevisHTML = (booking, docNum = `DEV-${new Date().getFullYear()}-???`) => {
    const dateFacture = new Date().toLocaleDateString("fr-FR");
    const decorationLabel =
      DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label || "Rubans et fleurs";
    const itineraire = formatBookingItineraire(booking);

    const eventDateObj = new Date(booking.date);
    const eventDateLabel = isNaN(eventDateObj)
      ? booking.date
      : eventDateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    // Date de validité du devis : émission + 7 jours
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + 7);
    const validityLabel = validityDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    const prixBaseAffiche =
      booking.prixBase != null ? booking.prixBase : booking.prix - (booking.shootingCost || 0);
    const acompte = calculateAcompte(booking.prix);
    const solde = booking.prix - acompte;

    // Lignes de la section "Description" — une ligne par prestation
    const lineItems = [
      { label: `Forfait évènement — ${itineraire}`, amount: prixBaseAffiche },
    ];
    if (booking.retour) lineItems.push({ label: "Supplément service retour" + (booking.lieuRetour ? ` (${booking.lieuRetour})` : ""), amount: SUPPLEMENT_RETOUR });
    if (booking.shootingHeures) lineItems.push({ label: `Shooting photo/vidéo (${booking.shootingHeures}h)`, amount: booking.shootingCost || 0 });

    const lineItemsHTML = lineItems
      .map(
        (it) => `
        <div class="d-item-row">
          <span class="d-item-label">${it.label}</span>
          <span class="d-item-amount">${formatCurrency(it.amount)}</span>
        </div>`
      )
      .join("");

    const devisHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Devis Fakhama Weddings - ${booking.client}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          @page {
            size: A4;
            margin: 0;
          }
          @page {
            @top-left { content: none; }
            @top-center { content: none; }
            @top-right { content: none; }
            @bottom-left { content: none; }
            @bottom-center { content: none; }
            @bottom-right { content: none; }
          }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 48px 16px;
            background: #ffffff;
            color: #1a1a1a;
          }
          .d-container {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border: none;
            box-shadow: none;
            padding: 56px 52px;
          }
          .d-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 36px;
          }
          .d-brand-logo { max-width: 190px; height: auto; margin-bottom: 10px; }
          .d-brand-name {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.02em;
          }
          .d-brand-sub { font-size: 12px; color: #6b6b6b; margin: 2px 0 0; }
          .d-doc-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 40px;
            font-weight: 700;
            letter-spacing: -0.02em;
            text-align: right;
            margin: 0;
          }
          .d-doc-number { text-align: right; font-size: 13px; color: #6b6b6b; margin-top: 6px; }

          .d-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 36px 0 8px;
            font-size: 13px;
          }
          .d-info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8a86; margin: 0 0 4px; }
          .d-info-value { margin: 0 0 2px; font-size: 14px; }

          .d-section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 26px;
            font-weight: 700;
            margin: 40px 0 18px;
          }

          .d-item-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: none;
            font-size: 14px;
          }
          .d-item-label { color: #262626; padding-right: 20px; }
          .d-item-amount { font-weight: 600; white-space: nowrap; }

          .d-totals { margin-top: 6px; }
          .d-total-row {
            display: flex;
            justify-content: flex-end;
            gap: 40px;
            padding: 7px 0;
            font-size: 14px;
          }
          .d-total-row .d-tl { color: #6b6b6b; min-width: 170px; text-align: left; }
          .d-total-row .d-tv { min-width: 110px; text-align: right; font-weight: 600; }
          .d-total-row.d-grand { border-top: none; margin-top: 8px; padding-top: 12px; }
          .d-total-row.d-grand .d-tl { font-weight: 700; color: #1a1a1a; }
          .d-total-row.d-grand .d-tv { font-weight: 700; font-size: 17px; }

          .d-validity {
            display: flex;
            justify-content: flex-end;
            gap: 40px;
            margin-top: 10px;
            font-size: 12.5px;
            color: #6b6b6b;
          }
          .d-validity .d-tl { min-width: 170px; text-align: left; }
          .d-validity .d-tv { min-width: 110px; text-align: right; }

          .d-badge {
            display: inline-block;
            margin-top: 18px;
            padding: 5px 14px;
            border: none;
            background: transparent;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 600;
          }

          .d-bottom {
            display: grid;
            grid-template-columns: 1.2fr 1.4fr 0.7fr;
            gap: 20px;
            align-items: start;
            margin-top: 54px;
            padding-top: 28px;
            border-top: 1px solid #1a1a1a;
          }
          .d-bottom h4 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 16px;
            margin: 0 0 10px;
          }
          .d-bottom p { font-size: 12.5px; line-height: 1.7; color: #3a3a3a; margin: 0 0 3px; }
          .d-terms-text { color: #6b6b6b !important; font-size: 11.5px !important; }

          .d-qr-wrap { text-align: center; }
          .d-qr-wrap img { width: 84px; height: 84px; display: block; margin: 0 auto 6px; }
          .d-qr-wrap p { font-size: 10px; color: #6b6b6b; margin: 0; }

          @media print {
            body { background: white; padding: 0; }
            .d-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="d-container">

          <div class="d-top">
            <div>
              <img class="d-brand-logo" src="${FAKHAMA_LOGO_BLACK_BASE64}" alt="Fakhama Weddings & Events" />
              <p class="d-brand-sub">Weddings &amp; Events · BMW Série 3 2026</p>
            </div>
            <div>
              <p class="d-doc-title">DEVIS</p>
              <p class="d-doc-number">N° ${docNum}<br/>Émis le ${dateFacture}</p>
            </div>
          </div>

          <div class="d-info-grid">
            <div>
              <p class="d-info-label">Client</p>
              <p class="d-info-value" style="font-weight:600;">${booking.client}</p>
              <p class="d-info-value">${booking.phone || "—"}</p>
            </div>
            <div>
              <p class="d-info-label">Évènement</p>
              <p class="d-info-value">${eventDateLabel} à ${booking.heure}</p>
              <p class="d-info-value">${booking.salleFetes || "Salle à confirmer"}</p>
            </div>
          </div>

          <h2 class="d-section-title">Description</h2>

          <div>
            ${lineItemsHTML}
          </div>

          <div class="d-totals">
            <div class="d-total-row"><span class="d-tl">Sous-total</span><span class="d-tv">${formatCurrency(booking.prix)}</span></div>
            <div class="d-total-row"><span class="d-tl">Acompte suggéré (${Math.round(ACOMPTE_PERCENTAGE * 100)}%)</span><span class="d-tv">${formatCurrency(acompte)}</span></div>
            <div class="d-total-row"><span class="d-tl">Solde avant l'évènement</span><span class="d-tv">${formatCurrency(solde)}</span></div>
            <div class="d-total-row d-grand"><span class="d-tl">Total estimé — TTC</span><span class="d-tv">${formatCurrency(booking.prix)}</span></div>
          </div>

          <div class="d-validity">
            <span class="d-tl">Validité du devis</span><span class="d-tv">${validityLabel}</span>
          </div>

          <span class="d-badge">Devis — non définitif</span>

          <div class="d-bottom">
            <div>
              <h4>Contact</h4>
              <p>Fakhama Weddings &amp; Events</p>
              <p>+216 93 993 619</p>
              <p>contact@fakhama.tn</p>
            </div>
            <div>
              <h4>Conditions</h4>
              <p class="d-terms-text">Proposition tarifaire valable 7 jours à compter de l'émission. Ne constitue ni une facture ni une confirmation de réservation.</p>
              <p class="d-terms-text">La réservation n'est garantie qu'après confirmation écrite et versement de l'acompte de ${Math.round(ACOMPTE_PERCENTAGE * 100)}%.</p>
            </div>
            <div class="d-qr-wrap">
              <img src="${FAKHAMA_QR_BASE64}" alt="QR Facebook Fakhama" />
              <p>Suivez-nous<br/>sur Facebook</p>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    return downloadPDF(devisHTML, `devis-FWE-${booking.client}-${booking.date}.pdf`).then(() => {
      showNotification("Devis généré avec succès", "success");
    });
  };

  // ── FACTURE — gabarit "carton d'invitation" doré (inchangé) + logo + QR ─────
 // ═══════════════════════════════════════════════════════════════════════════
// PATCH — Cadre décoratif pour la facture (fichier image fourni par l'utilisateur)
// ═══════════════════════════════════════════════════════════════════════════
// 1) Ajoute cette constante à côté de FAKHAMA_LOGO_BLACK_BASE64 / FAKHAMA_QR_BASE64
//    (juste après leur déclaration, en haut du fichier).
// 2) Remplace la fonction generateFactureHTML() existante par celle ci-dessous.
//    Elle utilise le cadre comme fond plein-page (au lieu du SVG "vigne+bouquets")
//    et ajoute un padding interne pour que rien (notamment le logo) ne touche le cadre.

const FAKHAMA_FRAME_BASE64 = "data:image/jpeg;base64,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";

// ── FACTURE — cadre décoratif image + logo + QR (remplace l'ancien SVG) ─────
const generateFactureHTML = (booking, docNum = `FAC-${new Date().getFullYear()}-???`) => {
    const dateFacture = new Date().toLocaleDateString("fr-FR");
    const heureFacture = new Date().toLocaleTimeString("fr-FR");
    const decorationLabel =
      DECORATION_OPTIONS.find((d) => d.value === booking.decoration)?.label || "Rubans traditionnels";
    const itineraire = formatBookingItineraire(booking);

    const eventDateObj = new Date(booking.date);
    const eventMonth = isNaN(eventDateObj)
      ? ""
      : getMonthName(eventDateObj.getMonth() + 1).toUpperCase();
    const eventDay = isNaN(eventDateObj) ? "" : String(eventDateObj.getDate()).padStart(2, "0");
    const eventYear = isNaN(eventDateObj) ? "" : eventDateObj.getFullYear();

    const prixBaseAffiche =
      booking.prixBase != null ? booking.prixBase : booking.prix - (booking.shootingCost || 0);

    const shootingRow = booking.shootingHeures
      ? `<div class="price-line"><span class="lab">Shooting photo/vidéo (${booking.shootingHeures}h)</span><span>${formatCurrency(booking.shootingCost || 0)}</span></div>`
      : "";

    const lieuRetourItem = booking.retour
      ? `<div><p class="block-label">Lieu du retour</p><p class="block-value small">${booking.lieuRetour || "À confirmer"}</p></div>`
      : "";
    const lieuShootingItem = booking.shootingHeures
      ? `<div><p class="block-label">Lieu du shooting</p><p class="block-value small">${booking.lieuShooting || "À confirmer"}</p></div>`
      : "";

    const accentMain = "#2b2013";
    const accentDivider = "#c6a869";
    const rsvpTitle = "Règlement";
    const totalLabel = "Reste à payer";
    const totalValue = booking.reste || 0;

    // ── PAGE 1 : détails de la facture + QR code ────────────────────────────
    const page1Content = `
      <img class="logo" src="${FAKHAMA_LOGO_BROWN_BASE64}" alt="Fakhama Weddings & Events" />
      <p class="brandline">Fakhama Weddings &amp; Events · BMW Série 3 320i 2026</p>

      <p class="intro">Cette facture est émise pour</p>

      <div class="clientname">${booking.client}</div>

      <div class="datewrap">
        <span class="dpart">${eventMonth}</span>
        <span class="bar"></span>
        <span class="dpart ddim">${eventDay}</span>
        <span class="bar"></span>
        <span class="dpart">${eventYear}</span>
      </div>
      <p class="timeline">à ${booking.heure} · N° ${docNum} · émise le ${dateFacture} à ${heureFacture}</p>

      <div class="divider"></div>

      <p class="block-label">Itinéraire</p>
      <p class="block-value">${itineraire}</p>
      <p class="block-value small">${booking.distance} km${booking.retour ? " · service retour inclus" : ""}</p>

      <div class="divider"></div>

      <div class="infogrid">
        <div>
          <p class="block-label">Emplacement du marié</p>
          <p class="block-value small">${booking.lieuMarie || "À confirmer"}</p>
        </div>
        <div>
          <p class="block-label">Emplacement de la mariée</p>
          <p class="block-value small">${booking.lieuMariee || "À confirmer"}</p>
        </div>
        <div>
          <p class="block-label">Salle des fêtes</p>
          <p class="block-value small">${booking.salleFetes || "À confirmer"}</p>
        </div>
        <div>
          <p class="block-label">Décoration</p>
          <p class="block-value small">${decorationLabel}</p>
        </div>
        ${lieuRetourItem}
        ${lieuShootingItem}
      </div>

      ${booking.commentaires ? `<p class="block-value small" style="margin-top:8px;">« ${booking.commentaires} »</p>` : ""}

      <div class="divider"></div>

      <div class="rsvp-title">${rsvpTitle}</div>

      <div class="price-line"><span class="lab">Forfait évènement</span><span>${formatCurrency(prixBaseAffiche)}</span></div>
      ${shootingRow}
      <div class="price-line"><span class="lab">Avance versée</span><span>${formatCurrency(booking.avance || 0)}</span></div>
      <div class="price-total">${totalLabel} — ${formatCurrency(totalValue)}</div>

      <div class="qr-block">
        <img src="${FAKHAMA_QR_BASE64}" alt="QR Facebook Fakhama" />
        <p>Suivez-nous sur Facebook</p>
      </div>
    `;

    // ── PAGE 2 : conditions générales + signature / cachet ─────────────────
    const page2Content = `
      <img class="logo" src="${FAKHAMA_LOGO_BROWN_BASE64}" alt="Fakhama Weddings & Events" />
      <p class="brandline">Fakhama Weddings &amp; Events · BMW Série 3 320i 2026</p>

      <p class="rsvp-title" style="margin-top:16px;">Conditions générales</p>

      <div class="terms-page2">
        <p><strong>Annulation</strong> — L'avance n'est pas remboursée en cas d'annulation moins de 7 jours avant la date prévue.</p>
        <p><strong>Retard</strong> — Majoration de 50 DT par heure de retard.</p>
        <p><strong>Paiement</strong> — Le contrat est annulé si le montant total n'est pas réglé à l'arrivée du chauffeur.</p>
        <p><strong>Sécurité</strong> — Les jeux d'artifice doivent être utilisés à une distance minimale de 5 mètres.</p>
        <p><strong>Itinéraire</strong> — En cas de circuit non sécurisé ou non asphalté, le chauffeur se réserve le droit de le modifier.</p>
        <p><strong>Assistance</strong> — En cas de problème mécanique, une voiture de même gamme ou supérieure sera fournie.</p>
        <p><strong>Départ</strong> — 24h avant, les emplacements du marié et de la mariée doivent être communiqués via WhatsApp avec localisation Maps.</p>
        <p><strong>Propreté</strong> — Une pénalité de 100 DT s'applique en cas de salissures importantes constatées.</p>
      </div>

      <div class="divider"></div>

      <p class="block-value small" style="margin-bottom: 18px;">
        En signant ce document, le client reconnaît avoir pris connaissance et accepté l'ensemble des conditions générales ci-dessus.
      </p>

      <div class="signature-zone">
        <div class="sig-client">
          <div class="signature-line"></div>
          <p class="signature-label">Signature du client</p>
        </div>
        <div class="stamp-cell">
          <!-- Tampon circulaire SVG — logo + texte courbes + infos -->
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 240" class="stamp-svg">
            <defs>
              <!-- Arc haut : r=98 → baseline texte haut dans l'anneau, passe par le haut -->
              <path id="top-arc" d="M 22,120 A 98,98 0 0,1 218,120"/>
              <!-- Arc bas : r=104, grand arc par le bas → baseline proche du grand cercle, texte dans l'anneau -->
              <path id="bot-arc" d="M 16,120 A 104,104 0 1,0 224,120"/>
              <clipPath id="logo-clip">
                <circle cx="120" cy="78" r="52"/>
              </clipPath>
            </defs>

            <!-- Cercle extérieur -->
            <circle cx="120" cy="120" r="112" fill="none" stroke="#2b2013" stroke-width="3"/>
            <!-- Cercle intérieur même couleur foncée -->
            <circle cx="120" cy="120" r="95" fill="none" stroke="#2b2013" stroke-width="2"/>
            <!-- Étoiles décoratives gauche/droite dans l'anneau -->
            <text x="10" y="124" text-anchor="middle" font-size="9" fill="#c6a869" font-family="serif">✦</text>
            <text x="230" y="124" text-anchor="middle" font-size="9" fill="#c6a869" font-family="serif">✦</text>

            <!-- Texte courbe HAUT : entre les 2 cercles -->
            <text font-family="Montserrat, sans-serif" font-size="10.5" font-weight="700"
                  fill="#2b2013" letter-spacing="1.5">
              <textPath href="#top-arc" startOffset="50%" text-anchor="middle">
                FAKHAMA WEDDINGS &amp; EVENTS
              </textPath>
            </text>
            <!-- Texte courbe BAS : entre les 2 cercles, dans l'anneau bas -->
            <text font-family="Montserrat, sans-serif" font-size="10" font-weight="600"
                  fill="#2b2013" letter-spacing="1.2">
              <textPath href="#bot-arc" startOffset="50%" text-anchor="middle">
                ✦  Le Bardo — Tunis, Tunisie  ✦
              </textPath>
            </text>

            <!-- Logo agrandi — occupe la moitié haute du petit cercle -->
            <image href="${FAKHAMA_LOGO_BROWN_BASE64}" x="64" y="26" width="112" height="104"
                   clip-path="url(#logo-clip)" preserveAspectRatio="xMidYMid meet"/>

            <!-- Séparateur doré sous le logo -->
            <line x1="60" y1="136" x2="180" y2="136" stroke="#c6a869" stroke-width="1"/>

            <!-- Infos centrales agrandies -->
            <text x="120" y="153" text-anchor="middle"
                  font-family="Montserrat, sans-serif" font-size="10" font-weight="600"
                  fill="#4a3a18">Émise le ${dateFacture}</text>
            <text x="120" y="169" text-anchor="middle"
                  font-family="Montserrat, sans-serif" font-size="10" font-weight="600"
                  fill="#4a3a18">+216 93 993 619</text>
            <text x="120" y="184" text-anchor="middle"
                  font-family="Montserrat, sans-serif" font-size="9" font-weight="500"
                  fill="#6b5230">contact@fakhama.tn</text>
          </svg>
          <p class="signature-label" style="margin-top:6px;">Cachet de la société</p>
        </div>
      </div>

      <p class="footer-sign">Avec toute notre estime</p>
      <p class="footer-contact">+216 93 993 619 · contact@fakhama.tn</p>
    `;

    const factureHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture Fakhama Weddings - ${booking.client}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Great+Vibes&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          @page { size: A4; margin: 0; }
          html { background: #cfc4a8; }
          body {
            font-family: 'Cormorant Garamond', serif;
            margin: 0;
            padding: 10mm 0;
            background: #cfc4a8;
            color: #2b2013;
          }

          .page {
            position: relative;
            width: 210mm;
            height: 297mm;
            background-image: url(${FACTURE_FRAME_BASE64});
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            box-shadow: 0 20px 60px rgba(50,40,20,0.35);
            margin: 0 auto 10mm;
            page-break-after: always;
            overflow: hidden;
          }
          .page:last-child { page-break-after: auto; }

          .content {
            position: absolute;
            top: 15%; left: 15%; right: 15%; bottom: 5%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow: hidden;
          }
          .content-inner {
            text-align: center;
            width: 100%;
            max-width: 130mm;
          }

          .brandline {
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: #5a4a28;
            margin: 0 0 5px;
            font-weight: 500;
          }
          .logo {
            display: block;
            max-width: 52mm;
            width: 100%;
            height: auto;
            margin: 0 auto 8px;
          }
          .intro {
            font-size: 12px;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            color: #3b2f16;
            line-height: 1.6;
            margin: 12px 0 4px;
            font-weight: 600;
          }

          .clientname {
            font-family: 'Great Vibes', cursive;
            font-size: 36px;
            color: ${accentMain};
            margin: 4px 0 12px;
            line-height: 1;
            word-break: break-word;
          }

          .datewrap {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 9px;
            margin: 8px 0 3px;
          }
          .datewrap .dpart {
            font-size: 13px;
            letter-spacing: 2.4px;
            text-transform: uppercase;
            color: ${accentMain};
            font-weight: 500;
          }
          .datewrap .ddim { font-size: 18px; font-weight: 700; }
          .datewrap .bar { width: 1px; height: 18px; background: ${accentDivider}; }

          .timeline {
            font-size: 10.5px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #3b2f16;
            margin: 5px 0 14px;
            font-weight: 500;
          }

          .divider {
            width: 80px;
            height: 1px;
            margin: 11px auto;
            background: linear-gradient(90deg, transparent, ${accentDivider}, transparent);
          }

          .block-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 9px;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            color: #5a4220;
            margin: 0 0 4px;
            font-weight: 700;
          }
          .block-value {
            font-size: 13px;
            color: #1e1609;
            line-height: 1.45;
            margin: 0 0 3px;
            font-weight: 600;
          }
          .block-value.small { font-size: 11.5px; color: #2e2410; font-weight: 500; }

          .infogrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 6px;
            margin: 2px 0 4px;
            text-align: center;
          }

          .rsvp-title {
            font-family: 'Great Vibes', cursive;
            font-size: 24px;
            color: ${accentMain};
            margin: 2px 0 7px;
          }

          .price-line {
            display: flex;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
            color: #1e1609;
            padding: 3px 0;
            font-weight: 600;
          }
          .price-line .lab {
            letter-spacing: 0.8px;
            text-transform: uppercase;
            font-size: 10px;
            color: #4a3a18;
            align-self: center;
            font-weight: 700;
          }
          .price-total {
            font-size: 17px;
            color: ${accentMain};
            margin: 9px 0 2px;
            font-weight: 700;
          }

          .terms-page2 {
            margin-top: 12px;
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            line-height: 1.75;
            color: #1e1609;
            text-align: left;
            padding: 13px 16px;
            background: rgba(245, 241, 230, 0.75);
            border: 1px solid ${accentDivider};
          }
          .terms-page2 p { margin: 0 0 7px; }
          .terms-page2 p:last-child { margin-bottom: 0; }
          .terms-page2 strong {
            color: ${accentMain};
            text-transform: uppercase;
            letter-spacing: 0.4px;
            font-size: 10px;
            font-weight: 700;
          }

          .signature-zone {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 7px;
            text-align: center;
            align-items: end;
          }
          .sig-client {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .signature-line {
            width: 100%;
            height: 34px;
            border-bottom: 1px solid ${accentMain};
          }
          .signature-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 9px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #4a3a18;
            margin-top: 5px;
            font-weight: 700;
          }

          .footer-sign {
            margin-top: 16px;
            font-family: 'Great Vibes', cursive;
            font-size: 18px;
            color: #2b2013;
          }
          .footer-contact {
            font-family: 'Montserrat', sans-serif;
            font-size: 9.5px;
            letter-spacing: 0.8px;
            color: #4a3a18;
            margin-top: 3px;
            font-weight: 600;
          }

          /* QR sur carte blanche nette */
          .qr-block {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-block img {
            width: 58px;
            height: 58px;
            display: block;
          }
          .qr-block p {
            font-family: 'Montserrat', sans-serif;
            font-size: 8px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #4a3a18;
            margin: 5px 0 0;
            font-weight: 700;
          }

          .stamp-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .stamp-svg {
            width: 140px;
            height: 140px;
          }

          @media print {
            html, body { background: white; padding: 0; }
            .page { box-shadow: none; margin: 0; }
          }
        </style>
      </head>
      <body>

        <div class="page">
          <div class="content">
            <div class="content-inner">
              ${page1Content}
            </div>
          </div>
        </div>

        <div class="page">
          <div class="content">
            <div class="content-inner">
              ${page2Content}
            </div>
          </div>
        </div>

      </body>
      </html>
    `;

    return downloadPDF(factureHTML, `facture-FWE-${booking.client}-${booking.date}.pdf`).then(() => {
      showNotification("Facture prestige générée avec succès", "success");
    });
  };
  // Ouvre la facture/devis dans un nouvel onglet et lance l'impression navigateur —
  // l'utilisateur choisit "Enregistrer en PDF" dans la boîte de dialogue d'impression.
  // Plus fiable que html2canvas pour ce gabarit (cadre décoratif pleine page en base64).
  const downloadPDF = (html, filename) => {
    return new Promise((resolve) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Merci d'autoriser les pop-ups pour générer le document.");
        resolve();
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.document.title = filename.replace(/\.pdf$/, "");

      try {
        printWindow.history.replaceState(
          null,
          filename.replace(/\.pdf$/, ""),
          "/devis"
        );
      } catch (err) {
        // ignore cases where history replace isn't available
      }

      const triggerPrint = () => {
        printWindow.focus();
        printWindow.print();
        resolve();
      };

      // Attend le chargement des images (logo, QR, cadre) avant d'imprimer.
      const images = Array.from(printWindow.document.querySelectorAll("img"));
      if (images.length === 0) {
        setTimeout(triggerPrint, 400);
        return;
      }
      let loaded = 0;
      const onOneLoaded = () => {
        loaded++;
        if (loaded === images.length) setTimeout(triggerPrint, 300);
      };
      images.forEach((img) => {
        if (img.complete) onOneLoaded();
        else { img.onload = onOneLoaded; img.onerror = onOneLoaded; }
      });
    });
  };

  // Raccourci dédié pour générer un devis (utilisé sur les réservations "En attente").
  const generateDevisPDF = (booking) => generateInvoiceEvenementPDF(booking, "devis");

  const sendDevisByWhatsApp = (booking) => {
    const docNum = getDocNumber(booking, "DEV");
    const phone = booking.phone ? booking.phone.replace(/\D/g, "") : "";
    const url = phone
      ? `https://wa.me/${phone.startsWith("216") ? phone : "216" + phone}?text=${encodeURIComponent(buildDevisMessage(booking, docNum))}`
      : `https://wa.me/?text=${encodeURIComponent(buildDevisMessage(booking, docNum))}`;
    window.open(url, "_blank");
  };

  const buildDevisMessage = (booking, docNum) => {
    const itineraire = formatBookingItineraire(booking);

    return [
      "Bonjour 👋",
      "",
      `Voici le devis de réservation pour ${booking.client || "le client"}.`,
      `📄 Devis N° ${docNum}`,
      `📅 Date : ${booking.date} à ${booking.heure}`,
      `📍 Itinéraire : ${itineraire}`,
      `💰 Prix total : ${formatCurrency(booking.prix)}`,
      `✅ Acompte : ${formatCurrency(booking.avance || 0)}`,
      "",
      "Merci pour votre confiance ✨",
    ].filter((l) => l !== null).join("\n");
  };

  const handleAddBooking = async () => {
    const errors = validateBookingComplete(newBooking, newBookingStops);
    if (Object.keys(errors).length > 0) {
      alert(Object.values(errors).join("\n"));
      return;
    }
    const shootingHeures = newBooking.shooting ? (Number(newBooking.shootingHeures) || 1) : 0;
    const { distance, prixBase, shootingCost, prix } = calculatePrice(newBookingStops, newBooking.retour, shootingHeures);
    const avance = Number(newBooking.avance) || 0;
    const reste = calculateRest(prix, avance, newBooking.paiement);
    const newBookingComplete = {
      ...newBooking,
      id: Date.now(),
      distance,
      prixBase,
      shootingHeures,
      shootingCost,
      prix,
      reste,
      avance,
      trajetStops: [...newBookingStops],
      trajet: newBookingStops.join(", "),
    };
    const { error } = await supabase.from("bookings").insert(bookingToRow(newBookingComplete));
    if (error) {
      console.error(error);
      showNotification("Erreur Supabase : réservation non enregistrée", "error");
      return;
    }
    setBookings((prev) => [...prev, newBookingComplete]);
    localStorage.removeItem("fakhama-draft");
    setDraftBooking(null);
    setNewBooking({ client: "", phone: "", date: "", heure: "20:00", retour: false, paiement: "En attente", avance: "", lieuMarie: "", lieuMariee: "", salleFetes: "", lieuRetour: "", lieuShooting: "", decoration: "rubans-fleurs", commentaires: "", shooting: false, shootingHeures: 1 });
    setNewBookingStops(["Tunis"]);
    showNotification("Réservation évenement ajoutée avec succès !", "success");
  };

  const handleSaveEdit = async () => {
    if (!editBooking) return;
    const errors = validateBookingComplete(editBooking, editBookingStops);
    if (Object.keys(errors).length > 0) {
      alert(Object.values(errors).join("\n"));
      return;
    }
    const shootingHeures = editBooking.shooting ? (Number(editBooking.shootingHeures) || 1) : 0;
    const { distance, prixBase, shootingCost, prix } = calculatePrice(editBookingStops, editBooking.retour, shootingHeures);
    const avance = Number(editBooking.avance) || 0;
    const reste = calculateRest(prix, avance, editBooking.paiement);
    const updatedBooking = { ...editBooking, distance, prixBase, shootingHeures, shootingCost, prix, reste, avance, trajetStops: [...editBookingStops], trajet: editBookingStops.join(", ") };
    const { error } = await supabase.from("bookings").update(bookingToRow(updatedBooking)).eq("id", editBooking.id);
    if (error) {
      console.error(error);
      showNotification("Erreur Supabase : modification non enregistrée", "error");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === editBooking.id ? updatedBooking : b)));
    setEditBooking(null);
    showNotification("Réservation modifiée avec succès", "success");
  };

  const handleDeleteBooking = (id) => {
    const b = bookings.find((x) => x.id === id);
    setConfirmModal({
      message: `Supprimer la réservation de ${b?.client || "ce client"} le ${b?.date || ""} ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (error) { showNotification("Erreur Supabase : suppression impossible", "error"); return; }
        setBookings((prev) => prev.filter((x) => x.id !== id));
        showNotification("Réservation supprimée", "info");
      },
    });
  };

  const handleQuickStatusChange = async (booking, newStatus) => {
    const avance = newStatus === "Payé" ? booking.prix : booking.avance;
    const reste = calculateRest(booking.prix, avance, newStatus);
    const updated = { ...booking, paiement: newStatus, avance, reste };
    const { error } = await supabase.from("bookings").update(bookingToRow(updated)).eq("id", booking.id);
    if (error) { showNotification("Erreur lors du changement de statut", "error"); return; }
    setBookings((prev) => prev.map((b) => b.id === booking.id ? updated : b));
    showNotification(`Statut mis à jour : ${newStatus}`, "success");
  };

  const handleDuplicateBooking = (b) => {
    setNewBooking({
      client: b.client, phone: b.phone, date: "", heure: b.heure,
      retour: b.retour, paiement: "En attente", avance: "",
      lieuMarie: b.lieuMarie, lieuMariee: b.lieuMariee, salleFetes: b.salleFetes,
      lieuRetour: b.lieuRetour, lieuShooting: b.lieuShooting,
      decoration: b.decoration, commentaires: b.commentaires,
      shooting: b.shooting, shootingHeures: b.shootingHeures,
    });
    setNewBookingStops([...(b.trajetStops || ["Tunis"])]);
    setActiveTab("reservations");
    showNotification(`Réservation de ${b.client} dupliquée — modifiez la date puis enregistrez`, "info");
  };

  const handleAddMaintenance = async () => {
    if (!newMaintenance.date || !newMaintenance.kilometrage || !newMaintenance.cout || !newMaintenance.type) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newMaintenance, kilometrage: parseInt(newMaintenance.kilometrage), cout: parseInt(newMaintenance.cout) };
    const { error } = await supabase.from("maintenances").insert(maintenanceToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : maintenance non enregistrée", "error"); return; }
    setMaintenances((prev) => [...prev, record]);
    setNewMaintenance({ date: new Date().toISOString().split("T")[0], kilometrage: "", type: "", description: "", cout: "" });
    showNotification("Maintenance ajoutée", "success");
  };
  const handleDeleteMaintenance = (id) => {
    const m = maintenances.find((x) => x.id === id);
    setConfirmModal({
      message: `Supprimer la maintenance "${m?.type || ""}" du ${m?.date || ""} ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const { error } = await supabase.from("maintenances").delete().eq("id", id);
        if (error) { showNotification("Erreur suppression maintenance", "error"); return; }
        setMaintenances((prev) => prev.filter((x) => x.id !== id));
      },
    });
  };

  const handleAddAssurance = async () => {
    if (!newAssurance.dateDebut || !newAssurance.dateFin || !newAssurance.cout || !newAssurance.compagnie) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newAssurance, cout: parseInt(newAssurance.cout) };
    const { error } = await supabase.from("assurances").insert(assuranceToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : assurance non enregistrée", "error"); return; }
    setAssurances((prev) => [...prev, record]);
    setNewAssurance({ dateDebut: "", dateFin: "", compagnie: "", cout: "", numeroContrat: "" });
    showNotification("Assurance ajoutée", "success");
  };
  const handleDeleteAssurance = (id) => {
    const a = assurances.find((x) => x.id === id);
    setConfirmModal({
      message: `Supprimer l'assurance ${a?.compagnie || ""} ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const { error } = await supabase.from("assurances").delete().eq("id", id);
        if (error) { showNotification("Erreur suppression assurance", "error"); return; }
        setAssurances((prev) => prev.filter((x) => x.id !== id));
      },
    });
  };

  const handleAddVignette = async () => {
    if (!newVignette.annee || !newVignette.cout) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = { id: Date.now(), ...newVignette, annee: parseInt(newVignette.annee), cout: parseInt(newVignette.cout) };
    const { error } = await supabase.from("vignettes").insert(vignetteToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : vignette non enregistrée", "error"); return; }
    setVignettes((prev) => [...prev, record]);
    setNewVignette({ annee: new Date().getFullYear(), cout: "", datePaiement: new Date().toISOString().split("T")[0] });
    showNotification("Vignette ajoutée", "success");
  };
  const handleDeleteVignette = (id) => {
    const v = vignettes.find((x) => x.id === id);
    setConfirmModal({
      message: `Supprimer la vignette ${v?.annee || ""} ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const { error } = await supabase.from("vignettes").delete().eq("id", id);
        if (error) { showNotification("Erreur suppression vignette", "error"); return; }
        setVignettes((prev) => prev.filter((x) => x.id !== id));
      },
    });
  };

  const handleAddCarburant = async () => {
    if (!newCarburant.date || !newCarburant.quantite || !newCarburant.prixLitre || !newCarburant.kilometrage) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const record = {
      id: Date.now(), ...newCarburant,
      quantite: parseFloat(newCarburant.quantite),
      prixLitre: parseFloat(newCarburant.prixLitre),
      kilometrage: parseInt(newCarburant.kilometrage),
      coutTotal: parseFloat(newCarburant.quantite) * parseFloat(newCarburant.prixLitre),
    };
    const { error } = await supabase.from("carburants").insert(carburantToRow(record));
    if (error) { console.error(error); showNotification("Erreur Supabase : plein non enregistré", "error"); return; }
    setCarburants((prev) => [...prev, record]);
    setNewCarburant({ date: new Date().toISOString().split("T")[0], quantite: "", prixLitre: "", kilometrage: "", station: "" });
    showNotification("Plein ajouté", "success");
  };
  const handleDeleteCarburant = (id) => {
    const c = carburants.find((x) => x.id === id);
    setConfirmModal({
      message: `Supprimer le plein du ${c?.date || ""} (${c?.quantite || ""}L) ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const { error } = await supabase.from("carburants").delete().eq("id", id);
        if (error) { showNotification("Erreur suppression carburant", "error"); return; }
        setCarburants((prev) => prev.filter((x) => x.id !== id));
      },
    });
  };

  const calculateStats = () => {
    const totalMaintenanceCost = maintenances.reduce((sum, m) => sum + m.cout, 0);
    const totalAssuranceCost = assurances.reduce((sum, a) => sum + a.cout, 0);
    const totalVignetteCost = vignettes.reduce((sum, v) => sum + v.cout, 0);
    const totalCarburantCost = carburants.reduce((sum, c) => sum + c.coutTotal, 0);
    const totalDepenses = totalMaintenanceCost + totalAssuranceCost + totalVignetteCost + totalCarburantCost;
    const totalRevenue = bookings.reduce((sum, b) => {
      if (b.paiement === "Payé") return sum + b.prix;
      if (b.paiement === "Avance") return sum + (b.avance || 0);
      return sum;
    }, 0);

    // Rentabilité par réservation : on alloue le coût variable (carburant + maintenance)
    // au prorata des km parcourus par réservation, pour estimer une marge brute par
    // trajet (hors coûts fixes comme assurance/vignette, non liés à un trajet précis).
    const totalKmDriven = bookings.reduce((sum, b) => sum + (Number(b.distance) || 0), 0);
    const variableCosts = totalCarburantCost + totalMaintenanceCost;
    const costPerKm = totalKmDriven > 0 ? variableCosts / totalKmDriven : 0;
    const avgMargin = bookings.length > 0
      ? bookings.reduce((sum, b) => sum + (b.prix - (Number(b.distance) || 0) * costPerKm), 0) / bookings.length
      : 0;

    const aEncaisser = bookings
      .filter((b) => b.paiement === "Avance")
      .reduce((sum, b) => sum + (b.reste || 0), 0);

    // Taux d'occupation : jours réservés ce mois vs jours dans le mois
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const reservedDaysThisMonth = new Set(
      bookings
        .filter((b) => {
          const d = new Date(b.date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && b.paiement !== "Non payé";
        })
        .map((b) => b.date)
    ).size;
    const tauxOccupation = Math.round((reservedDaysThisMonth / daysInMonth) * 100);

    // Kilométrage actuel = dernier km enregistré (carburant ou maintenance)
    const allKm = [
      ...carburants.map((c) => ({ km: c.kilometrage, date: c.date })),
      ...maintenances.map((m) => ({ km: m.kilometrage, date: m.date })),
    ].filter((x) => x.km).sort((a, b) => new Date(b.date) - new Date(a.date));
    const dernierKilometrage = allKm.length > 0 ? allKm[0].km : null;

    return {
      totalRevenue, totalDepenses, totalMaintenanceCost, totalAssuranceCost,
      totalVignetteCost, totalCarburantCost, netProfit: totalRevenue - totalDepenses,
      totalBookings: bookings.length,
      paidBookings: bookings.filter((b) => b.paiement === "Payé").length,
      pendingBookings: bookings.filter((b) => b.paiement === "Avance").length,
      unpaidBookings: bookings.filter((b) => b.paiement === "Non payé").length,
      quoteBookings: bookings.filter((b) => b.paiement === "En attente").length,
      costPerKm, avgMargin, aEncaisser, tauxOccupation, reservedDaysThisMonth, daysInMonth, dernierKilometrage,
    };
  };

  const stats = calculateStats();

  // ── EXPORT COMPTABLE CSV/Excel ────────────────────────────────────────────────
  const exportComptable = async () => {
    const XLSX = await import("xlsx");

    const moisFR = ["Janvier","Février","Mars","Avril","Mai","Juin",
                    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    // Retourne { y, m } ou null — normalise les vignettes sans date vers le 1er janvier
    const getYM = (dateStr) => {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : { y: d.getFullYear(), m: d.getMonth() };
    };
    // Clé de regroupement année-mois (ex: "2025-4")
    const ymKey = (ym) => `${ym.y}-${ym.m}`;

    // ── Feuille 1 : Revenus ──────────────────────────────────────────────────
    // Avance en haut (triés par date ASC), Payé en bas (triés par date ASC)
    const revenusRows = bookings
      .filter((b) => b.paiement === "Payé" || b.paiement === "Avance")
      .sort((a, b) => {
        const aIsPaid = a.paiement === "Payé" ? 1 : 0;
        const bIsPaid = b.paiement === "Payé" ? 1 : 0;
        if (aIsPaid !== bIsPaid) return aIsPaid - bIsPaid; // Avance avant Payé
        return new Date(a.date) - new Date(b.date);        // puis date ASC
      })
      .map((b) => {
        const encaisse = b.paiement === "Payé" ? b.prix : (b.avance || 0);
        const ym = getYM(b.date);
        return {
          "Date événement": b.date,
          "Mois": ym ? moisFR[ym.m] : "",
          "Année": ym ? ym.y : "",
          "Client": b.client,
          "Téléphone": b.phone || "",
          "Trajet": b.trajet || "",
          "Statut paiement": b.paiement,
          "Prix total (DT)": b.prix,
          "Avance (DT)": b.avance || 0,
          "Reste (DT)": b.reste || 0,
          "Encaissé (DT)": encaisse,
        };
      });

    // ── Feuille 2 : Dépenses ─────────────────────────────────────────────────
    // On stocke aussi la clé ymKey pour le récap (pas dans la feuille)
    const depensesRows = [];
    carburants.forEach((c) => {
      const ym = getYM(c.date);
      depensesRows.push({
        _ym: ym,
        "Date": c.date,
        "Mois": ym ? moisFR[ym.m] : "",
        "Année": ym ? ym.y : "",
        "Catégorie": "Carburant",
        "Description": `${c.quantite} L @ ${c.prixLitre} DT/L${c.station ? " — " + c.station : ""}`,
        "Montant (DT)": c.coutTotal,
      });
    });
    maintenances.forEach((m) => {
      const ym = getYM(m.date);
      depensesRows.push({
        _ym: ym,
        "Date": m.date,
        "Mois": ym ? moisFR[ym.m] : "",
        "Année": ym ? ym.y : "",
        "Catégorie": "Maintenance",
        "Description": `${m.type}${m.description ? " — " + m.description : ""}`,
        "Montant (DT)": m.cout,
      });
    });
    assurances.forEach((a) => {
      const ym = getYM(a.dateDebut);
      depensesRows.push({
        _ym: ym,
        "Date": a.dateDebut,
        "Mois": ym ? moisFR[ym.m] : "",
        "Année": ym ? ym.y : "",
        "Catégorie": "Assurance",
        "Description": `${a.compagnie}${a.numeroContrat ? " — N°" + a.numeroContrat : ""}`,
        "Montant (DT)": a.cout,
      });
    });
    vignettes.forEach((v) => {
      // Si pas de date de paiement, on prend le 1er janvier de l'année
      const dateStr = v.datePaiement || `${v.annee}-01-01`;
      const ym = getYM(dateStr);
      depensesRows.push({
        _ym: ym,
        "Date": v.datePaiement || `${v.annee}-01-01`,
        "Mois": ym ? moisFR[ym.m] : "",
        "Année": ym ? ym.y : v.annee,
        "Catégorie": "Vignette",
        "Description": `Vignette ${v.annee}`,
        "Montant (DT)": v.cout,
      });
    });
    depensesRows.sort((a, b) => new Date(a["Date"]) - new Date(b["Date"]));

    // Pré-calcule les dépenses par clé ymKey pour le récap
    const depByKey = {};
    depensesRows.forEach((r) => {
      if (!r._ym) return;
      const k = ymKey(r._ym);
      depByKey[k] = (depByKey[k] || 0) + r["Montant (DT)"];
    });

    // ── Feuille 3 : Récapitulatif mensuel ────────────────────────────────────
    const allDates = [
      ...bookings.map((b) => b.date),
      ...depensesRows.map((r) => r["Date"]),
    ].filter(Boolean);
    const years = [...new Set(
      allDates.map((d) => new Date(d).getFullYear()).filter((y) => !isNaN(y))
    )].sort();

    const recapRows = [];
    years.forEach((year) => {
      moisFR.forEach((moisLabel, mIdx) => {
        const k = `${year}-${mIdx}`;
        const revenuMois = bookings
          .filter((b) => { const ym = getYM(b.date); return ym && ym.y === year && ym.m === mIdx && (b.paiement === "Payé" || b.paiement === "Avance"); })
          .reduce((s, b) => s + (b.paiement === "Payé" ? b.prix : (b.avance || 0)), 0);
        const depenseMois = depByKey[k] || 0;

        if (revenuMois > 0 || depenseMois > 0) {
          recapRows.push({
            "Année": year,
            "Mois": moisLabel,
            "N° Mois": mIdx + 1,
            "Revenus encaissés (DT)": revenuMois,
            "Dépenses (DT)": depenseMois,
            "Bénéfice net (DT)": revenuMois - depenseMois,
          });
        }
      });
      // Ligne total annuel — recalcule sur les lignes déjà poussées pour cette année
      const yearRows = recapRows.filter((r) => r["Année"] === year && r["Mois"] !== "TOTAL ANNUEL");
      const totalRev = yearRows.reduce((s, r) => s + r["Revenus encaissés (DT)"], 0);
      const totalDep = yearRows.reduce((s, r) => s + r["Dépenses (DT)"], 0);
      recapRows.push({
        "Année": year,
        "Mois": "TOTAL ANNUEL",
        "N° Mois": 13,
        "Revenus encaissés (DT)": totalRev,
        "Dépenses (DT)": totalDep,
        "Bénéfice net (DT)": totalRev - totalDep,
      });
    });

    // ── Construction du classeur ─────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // Retire le champ interne _ym avant d'écrire la feuille Dépenses
    const depExport = depensesRows.map(({ _ym, ...rest }) => rest);

    const wsRevenus = XLSX.utils.json_to_sheet(revenusRows.length ? revenusRows : [{ "Info": "Aucun revenu enregistré" }]);
    const wsDep     = XLSX.utils.json_to_sheet(depExport.length  ? depExport  : [{ "Info": "Aucune dépense enregistrée" }]);
    const wsRecap   = XLSX.utils.json_to_sheet(recapRows.length  ? recapRows  : [{ "Info": "Aucune donnée" }]);

    XLSX.utils.book_append_sheet(wb, wsRevenus, "Revenus");
    XLSX.utils.book_append_sheet(wb, wsDep,     "Dépenses");
    XLSX.utils.book_append_sheet(wb, wsRecap,   "Récapitulatif");

    const annee = new Date().getFullYear();
    XLSX.writeFile(wb, `fakhama-comptabilite-${annee}.xlsx`);
    showNotification("Export comptable téléchargé ✓", "success");
  };

  // Filtre + recherche (nom client ou téléphone)
  // Les réservations "Payé" sont archivées : elles quittent la liste active des
  // réservations et n'apparaissent plus que dans l'onglet Archive du menu.
  const filteredBookings = bookings
    .filter((b) => b.paiement !== "Payé")
    .filter((b) => {
      if (filter.date && b.date !== filter.date) return false;
      if (filter.status && b.paiement !== filter.status) return false;
      if (filterDateFrom && b.date < filterDateFrom) return false;
      if (filterDateTo && b.date > filterDateTo) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const matchClient = (b.client || "").toLowerCase().includes(s);
        const matchPhone = (b.phone || "").toLowerCase().includes(s);
        if (!matchClient && !matchPhone) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;
      if (dateA !== dateB) {
        return dateA < dateB ? 1 : -1;
      }
      return timeToMinutes(b.heure) - timeToMinutes(a.heure);
    });

  // Réservations archivées (statut "Payé"), affichées uniquement dans l'onglet Archive.
  const archivedBookings = bookings
    .filter((b) => b.paiement === "Payé")
    .filter((b) => {
      if (archiveSearch.trim()) {
        const s = archiveSearch.trim().toLowerCase();
        const matchClient = (b.client || "").toLowerCase().includes(s);
        const matchPhone = (b.phone || "").toLowerCase().includes(s);
        if (!matchClient && !matchPhone) return false;
      }
      if (archiveDateFrom && b.date < archiveDateFrom) return false;
      if (archiveDateTo && b.date > archiveDateTo) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;
      if (dateA !== dateB) {
        return dateA < dateB ? 1 : -1;
      }
      return timeToMinutes(b.heure) - timeToMinutes(a.heure);
    });

  // Pagination réservations
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  // Pagination archive
  const archiveTotalPages = Math.max(1, Math.ceil(archivedBookings.length / itemsPerPage));
  const safeArchivePage = Math.min(archivePage, archiveTotalPages);
  const paginatedArchive = archivedBookings.slice(
    (safeArchivePage - 1) * itemsPerPage,
    safeArchivePage * itemsPerPage
  );

  if (!authenticated) {
    return (
      <LoginForm
        onLogin={async (email, password) => {
          setLoginLoading(true);
          setLoginError("");
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setLoginLoading(false);
          if (error) setLoginError("Email ou mot de passe incorrect.");
          // onAuthStateChange gère setAuthenticated(true) automatiquement
        }}
        error={loginError}
        loading={loginLoading}
      />
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 placeholder-gray-400 bg-white";
  const inputErrorClass = "w-full px-3 py-2 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-400 bg-white";

  if (dataLoading && bookings.length === 0 && !dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données depuis Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={async () => { await supabase.auth.signOut(); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0">
        {dataError && (
          <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-between">
            <span>⚠️ {dataError}</span>
            <button onClick={loadAllData} className="underline font-medium">Réessayer</button>
          </div>
        )}

        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Bouton hamburger — visible uniquement sur mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 text-xl leading-none"
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Bonjour, Taz 👋</h1>
              <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Bienvenue sur votre tableau de bord Fakhama</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-lg">
            <span title="Rechercher">🔍</span>
            <span title="Notifications">🔔</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-4 md:py-6 px-4 md:px-8">

          {activeTab === "simulation" && <PriceSimulation bookings={bookings} />}

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <AllReminders bookings={bookings} assurances={assurances} onSelectBooking={(booking) => { setEditBooking(booking); setEditBookingStops(booking.trajetStops || [booking.trajet || "Tunis"]); }} />
              <RealTimeStats bookings={bookings} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard
                  label="Revenus"
                  value={formatCurrency(stats.totalRevenue)}
                  deltaLabel={`${stats.totalBookings} réservations`}
                  progress={stats.totalRevenue > 0 ? 70 : 0}
                  color="rose"
                />
                <KpiCard
                  label="Bénéfice net"
                  value={formatCurrency(stats.netProfit)}
                  deltaLabel={`Marge ${stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%`}
                  progress={stats.totalRevenue > 0 ? Math.max(0, (stats.netProfit / stats.totalRevenue) * 100) : 0}
                  color={stats.netProfit >= 0 ? "green" : "red"}
                />
                <KpiCard
                  label="Dépenses totales"
                  value={formatCurrency(stats.totalDepenses)}
                  deltaLabel="Maintenance, assurance, vignette, carburant"
                  progress={stats.totalRevenue > 0 ? Math.min(100, (stats.totalDepenses / stats.totalRevenue) * 100) : 0}
                  color="red"
                />
                <KpiCard
                  label="En attente (avance)"
                  value={stats.pendingBookings}
                  deltaLabel="Réservations avec avance"
                  progress={stats.totalBookings > 0 ? (stats.pendingBookings / stats.totalBookings) * 100 : 0}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard
                  label="💵 À encaisser"
                  value={formatCurrency(stats.aEncaisser)}
                  deltaLabel={`${stats.pendingBookings} client(s) avec avance en cours`}
                  color="amber"
                />
                <KpiCard
                  label="🚗 Taux occupation"
                  value={`${stats.tauxOccupation}%`}
                  deltaLabel={`${stats.reservedDaysThisMonth} j. réservés / ${stats.daysInMonth} ce mois`}
                  progress={stats.tauxOccupation}
                  color={stats.tauxOccupation >= 70 ? "green" : stats.tauxOccupation >= 40 ? "amber" : "rose"}
                />
                <KpiCard
                  label="Devis en attente"
                  value={stats.quoteBookings}
                  deltaLabel="Réservations à confirmer par le client"
                  color="amber"
                />
                <KpiCard
                  label="Marge brute moy. / résa"
                  value={formatCurrency(stats.avgMargin)}
                  deltaLabel="Hors coûts fixes (assurance, vignette)"
                  color={stats.avgMargin >= 0 ? "green" : "red"}
                />
              </div>

              <AnnualSummaryChart bookings={bookings} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReservationsVsTarget bookings={bookings} />
                <RevenueByCity bookings={bookings} />
              </div>

              <CalendarView bookings={bookings} onDayClick={(dayBookings) => setSelectedDayBookings(dayBookings)} />
              <AdvancedStats bookings={bookings} />
            </div>
          )}

          {selectedDayBookings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDayBookings(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3 rounded-t-lg">
                  <h3 className="text-lg font-bold text-white">Réservations du {selectedDayBookings[0]?.date}</h3>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {selectedDayBookings.map((booking) => (
                    <div key={booking.id} className="border-b py-3 last:border-0">
                      <p className="font-semibold text-gray-900">{booking.client}</p>
                      <p className="text-sm text-gray-600">Heure: {booking.heure}</p>
                      <p className="text-sm text-gray-600">
                        Itinéraire: {formatBookingItineraire(booking)}
                      </p>
                      <Badge variant={paiementVariant(booking.paiement)}>
                        {booking.paiement}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <button onClick={() => setSelectedDayBookings(null)} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Fermer</button>
                </div>
              </div>
            </div>
          )}

          {/* RESERVATIONS TAB */}
          {activeTab === "reservations" && (
            <>
              <AllReminders bookings={bookings} assurances={assurances} onSelectBooking={(booking) => { setEditBooking(booking); setEditBookingStops(booking.trajetStops || [booking.trajet || "Tunis"]); }} />

              {/* Calendrier des réservations — toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setShowReservationsCalendar((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>📅</span>
                  {showReservationsCalendar ? "Masquer le calendrier" : "Afficher le calendrier"}
                </button>
                {showReservationsCalendar && (
                  <div className="mt-3">
                    <CalendarView
                      bookings={bookings}
                      onDayClick={(dayBookings) => setSelectedDayBookings(dayBookings)}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
                    <input type="text" placeholder="Nom ou téléphone..." value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par statut</label>
                    <select value={filter.status || ""} onChange={(e) => { setFilter((prev) => ({ ...prev, status: e.target.value || undefined })); setCurrentPage(1); }} className={inputClass}>
                      <option value="">Tous les statuts</option>
                      {PAIEMENT_STATUSES.filter((s) => s !== "Payé").map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                    <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                    <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }} className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { setFilter({}); setSearch(""); setFilterDateFrom(""); setFilterDateTo(""); setCurrentPage(1); }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm">Réinitialiser</button>
                  </div>
                </div>
              </div>

              {/* NEW BOOKING FORM */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">💍 Nouvelle Réservation Evenement</h2>
                  {draftBooking && (
                    <button onClick={() => {
                      setNewBooking(draftBooking);
                      if (draftBooking.stops) setNewBookingStops(draftBooking.stops);
                      showNotification("Brouillon restauré", "info");
                    }} className="text-sm text-rose-600 hover:underline">
                      Restaurer brouillon
                    </button>
                  )}
                </div>

                {/* ── ÉTAPE 1 : Itinéraire (choisi en premier) ─────────────────── */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-3">1. Itinéraire</h3>
                  <MultiStopSelector stops={newBookingStops} onChange={setNewBookingStops} />
                  <div className="mt-3 flex flex-wrap items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                    <span className="text-sm text-rose-700 font-medium">Prix estimé :</span>
                    <span className="text-xl font-bold text-rose-600">
                      {formatCurrency(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix)}
                    </span>
                    <span className="text-xs text-rose-500">
                      ({calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).distance} km total
                      {newBooking.shooting ? ` + ${formatCurrency(calculateShootingCost(newBooking.shootingHeures))} shooting` : ""})
                    </span>
                  </div>
                </div>

                {/* ── ÉTAPE 2 : Données du client ───────────────────────────────── */}
                <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-3 border-t pt-4">2. Informations client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                    <input placeholder="Nom du client" value={newBooking.client}
                      onChange={(e) => handleFieldChange("client", e.target.value)}
                      className={validationErrors.client ? inputErrorClass : inputClass} />
                    {validationErrors.client && <p className="text-red-500 text-xs mt-1">{validationErrors.client}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input placeholder="Numéro de téléphone" value={newBooking.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      className={validationErrors.phone ? inputErrorClass : inputClass} />
                    {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={newBooking.date}
                      onChange={(e) => handleFieldChange("date", e.target.value)}
                      className={validationErrors.date ? inputErrorClass : inputClass} />
                    {validationErrors.date && <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>}
                    {newBooking.date && bookings.some((b) => b.date === newBooking.date) && (
                      <p className="text-orange-600 text-xs mt-1 font-medium flex items-center gap-1">
                        🟠 Ce jour a déjà {bookings.filter((b) => b.date === newBooking.date).length} réservation(s)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input type="time" value={newBooking.heure}
                      onChange={(e) => handleFieldChange("heure", e.target.value)}
                      className={validationErrors.heure ? inputErrorClass : inputClass} />
                    {validationErrors.heure && <p className="text-red-500 text-xs mt-1">{validationErrors.heure}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Avance (DT)</label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Montant de l'avance" value={newBooking.avance}
                        onChange={(e) => handleFieldChange("avance", Number(e.target.value))}
                        className={validationErrors.avance ? inputErrorClass : inputClass} />
                      <button
                        type="button"
                        title={`Calculer ${Math.round(ACOMPTE_PERCENTAGE * 100)}% du prix total`}
                        onClick={() => {
                          const { prix } = calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0);
                          handleFieldChange("avance", calculateAcompte(prix));
                        }}
                        className="shrink-0 px-3 py-2 text-xs font-medium bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 whitespace-nowrap"
                      >
                        {Math.round(ACOMPTE_PERCENTAGE * 100)}%
                      </button>
                    </div>
                    {validationErrors.avance && <p className="text-red-500 text-xs mt-1">{validationErrors.avance}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Acompte {Math.round(ACOMPTE_PERCENTAGE * 100)}% = {formatCurrency(calculateAcompte(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix))} · Solde avant l'événement = {formatCurrency(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix - calculateAcompte(calculateTotalPrice(newBookingStops, newBooking.retour, newBooking.shooting ? newBooking.shootingHeures : 0).prix))}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                    <select value={newBooking.paiement} onChange={(e) => handleNewBookingPaiementChange(e.target.value)} className={inputClass}>
                      {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {newBooking.paiement === "En attente" && (
                      <p className="text-xs text-amber-600 mt-1">Devis envoyé, en attente de confirmation du client.</p>
                    )}
                    {newBooking.paiement === "Avance" && (
                      <p className="text-xs text-rose-600 mt-1">Acompte {Math.round(ACOMPTE_PERCENTAGE * 100)}% calculé et mis à jour automatiquement selon l'itinéraire — modifiable ci-dessus.</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <input type="checkbox" id="retour" checked={newBooking.retour}
                      onChange={(e) => setNewBooking({ ...newBooking, retour: e.target.checked })}
                      className="rounded border-gray-300" />
                    <label htmlFor="retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <input type="checkbox" id="shooting" checked={newBooking.shooting}
                      onChange={(e) => setNewBooking({ ...newBooking, shooting: e.target.checked, shootingHeures: e.target.checked ? (newBooking.shootingHeures || 1) : newBooking.shootingHeures })}
                      className="rounded border-gray-300" />
                    <label htmlFor="shooting" className="text-sm font-medium text-gray-700 cursor-pointer">📸 Shooting photo/vidéo (50 DT/h)</label>
                  </div>
                  {newBooking.shooting && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'heures de shooting</label>
                      <input type="number" min="0.5" step="0.5" value={newBooking.shootingHeures}
                        onChange={(e) => setNewBooking({ ...newBooking, shootingHeures: Math.max(0, Number(e.target.value)) })}
                        className={inputClass} />
                    </div>
                  )}
                </div>

                {newBooking.date && (
                  <div className="mb-4 border rounded-xl overflow-hidden shadow-sm">
                    <CalendarView
                      bookings={bookings}
                      onDayClick={(dayBookings) => setSelectedDayBookings(dayBookings)}
                      highlightDate={newBooking.date}
                    />
                  </div>
                )}

                <details className="border-t pt-4 group" open>
                  <summary className="flex items-center justify-between cursor-pointer list-none mb-3">
                    <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-wide">3. 💍 Détails de l'événement</h3>
                    <span className="text-gray-400 text-sm group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement du Marié</label>
                    <input type="text" value={newBooking.lieuMarie}
                      onChange={(e) => setNewBooking({ ...newBooking, lieuMarie: e.target.value })}
                      placeholder="Adresse de prise en charge du marié" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement de la Mariée</label>
                    <input type="text" value={newBooking.lieuMariee}
                      onChange={(e) => setNewBooking({ ...newBooking, lieuMariee: e.target.value })}
                      placeholder="Adresse de prise en charge de la mariée" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">🎪 Salle des Fêtes</label>
                    <input type="text" value={newBooking.salleFetes}
                      onChange={(e) => setNewBooking({ ...newBooking, salleFetes: e.target.value })}
                      placeholder="Nom et adresse de la salle des fêtes" className={inputClass} />
                  </div>
                  {newBooking.retour && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Lieu du Retour</label>
                      <input type="text" value={newBooking.lieuRetour}
                        onChange={(e) => setNewBooking({ ...newBooking, lieuRetour: e.target.value })}
                        placeholder="Adresse de dépose au retour" className={inputClass} />
                    </div>
                  )}
                  {newBooking.shooting && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">📸 Lieu du Shooting</label>
                      <input type="text" value={newBooking.lieuShooting}
                        onChange={(e) => setNewBooking({ ...newBooking, lieuShooting: e.target.value })}
                        placeholder="Lieu de la séance photo/vidéo" className={inputClass} />
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires Spéciaux</label>
                    <textarea value={newBooking.commentaires}
                      onChange={(e) => setNewBooking({ ...newBooking, commentaires: e.target.value })}
                      placeholder="Demandes particulières..." className={`${inputClass} h-20`} />
                  </div>
                </div>
                </details>
                <div className="flex gap-3 mt-6 pt-4 border-t sticky bottom-0 bg-white pb-2">
                  <button onClick={handleAddBooking}
                    className="flex-1 bg-gradient-to-r from-rose-600 to-amber-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-rose-700 hover:to-amber-700 transition-all text-sm shadow-sm">
                    💍 Enregistrer la réservation
                  </button>
                </div>
              </div>

              {/* BOOKINGS TABLE / LIST */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">💍 Réservations Evenement ({filteredBookings.length})</h2>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-500 hidden md:block">Triées : date récente ↑ · même date : heure tardive ↑ / heure tôt ↓</p>
                    <ViewModeToggle mode={reservationsView} setMode={setReservationsView} />
                  </div>
                </div>

                {reservationsView === "list" ? (
                  <div className="space-y-3">
                    {paginatedBookings.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Aucune réservation trouvée</p>
                    ) : paginatedBookings.map((b) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        docNum={getDocNumber(b)}
                        onStatusChange={handleQuickStatusChange}
                        onDevis={sendDevisByWhatsApp}
                        onFacture={generateInvoiceEvenementPDF}
                        onEdit={(bk) => { setEditBooking(bk); setEditBookingStops(bk.trajetStops || [bk.trajet || "Tunis"]); }}
                        onDelete={handleDeleteBooking}
                      />
                    ))}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Client","Téléphone","Date","Heure","Itinéraire","Km","Shooting","Prix","Avance","Reste","Paiement","Retour","Actions"].map((h) => (
                          <th key={h} className="border border-gray-300 px-4 py-2 text-left text-sm text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBookings.length === 0 ? (
                        <tr><td colSpan={13} className="border border-gray-300 px-4 py-8 text-center text-gray-500">Aucune réservation trouvée</td></tr>
                      ) : paginatedBookings.map((b, idx) => {
                        const prevDate = idx > 0 ? paginatedBookings[idx - 1].date : null;
                        const isNewDateGroup = b.date !== prevDate;
                        return (
                          <tr key={b.id} className={`hover:bg-gray-50 ${isNewDateGroup && idx > 0 ? "border-t-2 border-rose-200" : ""}`}>
                            <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                              <div className="flex items-center gap-1">
                                {b.client}
                                {b.commentaires && (
                                  <span title={b.commentaires} className="cursor-help text-amber-500 text-xs">💬</span>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.phone || "-"}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700 whitespace-nowrap">
                              <span className={isNewDateGroup ? "font-semibold text-rose-700" : "text-gray-700"}>
                                {b.date}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700 font-mono">{b.heure}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700 max-w-40">
                              <span className="text-xs">
                                {formatBookingItineraire(b)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.distance || 0} km</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">
                              {b.shooting ? (
                                <span className="text-xs">
                                  📸 {b.shootingHeures ? `${b.shootingHeures}h` : ""}
                                  {b.lieuShooting ? <><br/><span className="text-gray-500">{b.lieuShooting}</span></> : ""}
                                </span>
                              ) : "-"}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{b.prix}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.avance || 0}</td>
                            <td className={`border border-gray-300 px-4 py-2 font-semibold ${b.reste > 0 && b.paiement === "Avance" ? "text-amber-600" : b.paiement === "Payé" ? "text-green-600" : "text-red-600"}`}>
                              {b.reste}{b.paiement === "Payé" && " ✓"}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <select
                                value={b.paiement}
                                onChange={(e) => handleQuickStatusChange(b, e.target.value)}
                                className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                                  b.paiement === "Payé" ? "bg-green-100 text-green-800" :
                                  b.paiement === "Avance" ? "bg-gray-100 text-gray-800" :
                                  b.paiement === "En attente" ? "bg-amber-100 text-amber-800" :
                                  "bg-red-100 text-red-800"
                                }`}
                              >
                                {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Badge variant={b.retour ? "default" : "outline"}>{b.retour ? "Oui" : "Non"}</Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {b.paiement === "En attente" ? (
                                  <button onClick={() => sendDevisByWhatsApp(b)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">📝 Devis</button>
                                ) : (
                                  <button onClick={() => generateInvoiceEvenementPDF(b)} className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs">💍 Facture</button>
                                )}
                                <WhatsAppButton booking={b} docNum={getDocNumber(b)} onFacture={generateInvoiceEvenementPDF} />
                                <button onClick={() => {
                                  setEditBooking(b);
                                  setEditBookingStops(b.trajetStops || [b.trajet || "Tunis"]);
                                }} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-xs">Modifier</button>
                                <button onClick={() => handleDuplicateBooking(b)} className="px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-xs">📋 Copier</button>
                                <button onClick={() => handleDeleteBooking(b.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Supprimer</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}

                {filteredBookings.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Page {safeCurrentPage} / {totalPages} — {filteredBookings.length} résultat(s)</span>
                    <div className="flex gap-2">
                      <button
                        disabled={safeCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <button
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ARCHIVE TAB — réservations marquées "Payé" */}
          {activeTab === "archive" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📦 Archive</h2>
                <p className="text-sm text-gray-500 mt-1">Réservations entièrement réglées (statut « Payé »), conservées ici hors de la liste active.</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
                    <input type="text" placeholder="Nom ou téléphone..." value={archiveSearch}
                      onChange={(e) => { setArchiveSearch(e.target.value); setArchivePage(1); }} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                    <input type="date" value={archiveDateFrom} onChange={(e) => { setArchiveDateFrom(e.target.value); setArchivePage(1); }} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                    <input type="date" value={archiveDateTo} onChange={(e) => { setArchiveDateTo(e.target.value); setArchivePage(1); }} className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { setArchiveSearch(""); setArchiveDateFrom(""); setArchiveDateTo(""); setArchivePage(1); }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm">Réinitialiser</button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-gray-900">✅ Réservations archivées ({archivedBookings.length})</h3>
                  <ViewModeToggle mode={archiveView} setMode={setArchiveView} />
                </div>

                {archiveView === "list" ? (
                  <div className="space-y-3">
                    {archivedBookings.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Aucune réservation archivée</p>
                    ) : paginatedArchive.map((b) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        docNum={getDocNumber(b)}
                        onStatusChange={handleQuickStatusChange}
                        onFacture={generateInvoiceEvenementPDF}
                        onEdit={(bk) => { setEditBooking(bk); setEditBookingStops(bk.trajetStops || [bk.trajet || "Tunis"]); }}
                        onDelete={handleDeleteBooking}
                      />
                    ))}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Client","Téléphone","Date","Heure","Itinéraire","Km","Shooting","Prix","Paiement","Actions"].map((h) => (
                          <th key={h} className="border border-gray-300 px-4 py-2 text-left text-sm text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archivedBookings.length === 0 ? (
                        <tr><td colSpan={10} className="border border-gray-300 px-4 py-8 text-center text-gray-500">Aucune réservation archivée</td></tr>
                      ) : paginatedArchive.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">{b.client}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.phone || "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 whitespace-nowrap">{b.date}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 font-mono">{b.heure}</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700 max-w-40">
                            <span className="text-xs">
                              {formatBookingItineraire(b)}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.distance || 0} km</td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{b.shootingHeures ? `${b.shootingHeures}h` : "-"}</td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{b.prix}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Badge variant="success">{b.paiement}</Badge>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              <button onClick={() => generateInvoiceEvenementPDF(b)} className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs">💍 Facture</button>
                              <WhatsAppButton booking={b} docNum={getDocNumber(b)} onFacture={generateInvoiceEvenementPDF} />
                              <button onClick={() => {
                                setEditBooking(b);
                                setEditBookingStops(b.trajetStops || [b.trajet || "Tunis"]);
                              }} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-xs">Modifier</button>
                              <button onClick={() => handleDeleteBooking(b.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Supprimer</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}

                {/* Pagination archive */}
                {archivedBookings.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Page {safeArchivePage} / {archiveTotalPages} — {archivedBookings.length} résultat(s)</span>
                    <div className="flex gap-2">
                      <button
                        disabled={safeArchivePage === 1}
                        onClick={() => setArchivePage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <button
                        disabled={safeArchivePage === archiveTotalPages}
                        onClick={() => setArchivePage((p) => Math.min(archiveTotalPages, p + 1))}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COMPTABILITÉ TAB */}
          {activeTab === "comptabilite" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">🧾 Export Comptable</h2>
                  <p className="text-sm text-gray-500 mt-1">Revenus et dépenses par mois / par an — pour la déclaration fiscale</p>
                </div>
                <button
                  onClick={exportComptable}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  ⬇️ Télécharger Excel (.xlsx)
                </button>
              </div>

              {/* Aperçu récapitulatif */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Aperçu — Revenus et dépenses par mois</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Année</th>
                        <th className="px-4 py-3 text-left font-semibold">Mois</th>
                        <th className="px-4 py-3 text-right font-semibold">Revenus (DT)</th>
                        <th className="px-4 py-3 text-right font-semibold">Dépenses (DT)</th>
                        <th className="px-4 py-3 text-right font-semibold">Bénéfice net (DT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const moisFR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
                        const getYM = (d) => { const x = new Date(d); return isNaN(x.getTime()) ? null : { y: x.getFullYear(), m: x.getMonth() }; };
                        // Dépenses par clé année-mois (même logique que l'export)
                        const depByKey = {};
                        carburants.forEach((c) => { const ym = getYM(c.date); if (ym) { const k=`${ym.y}-${ym.m}`; depByKey[k]=(depByKey[k]||0)+c.coutTotal; } });
                        maintenances.forEach((m) => { const ym = getYM(m.date); if (ym) { const k=`${ym.y}-${ym.m}`; depByKey[k]=(depByKey[k]||0)+m.cout; } });
                        assurances.forEach((a) => { const ym = getYM(a.dateDebut); if (ym) { const k=`${ym.y}-${ym.m}`; depByKey[k]=(depByKey[k]||0)+a.cout; } });
                        vignettes.forEach((v) => { const ym = getYM(v.datePaiement||`${v.annee}-01-01`); if (ym) { const k=`${ym.y}-${ym.m}`; depByKey[k]=(depByKey[k]||0)+v.cout; } });
                        // Toutes les clés année-mois présentes
                        const keys = new Set([
                          ...bookings.filter((b)=>b.paiement==="Payé"||b.paiement==="Avance").map((b)=>{ const ym=getYM(b.date); return ym?`${ym.y}-${ym.m}`:null; }).filter(Boolean),
                          ...Object.keys(depByKey),
                        ]);
                        const sorted = [...keys].sort();
                        if (sorted.length === 0) return (
                          <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Aucune donnée disponible</td></tr>
                        );
                        // Grouper par année
                        const yearGroups = {};
                        sorted.forEach((k) => { const [y] = k.split("-"); if (!yearGroups[y]) yearGroups[y]=[]; yearGroups[y].push(k); });
                        const rows = [];
                        Object.keys(yearGroups).sort().forEach((year, yi) => {
                          let yearRev = 0, yearDep = 0;
                          yearGroups[year].forEach((k, i) => {
                            const [y, mStr] = k.split("-");
                            const mIdx = parseInt(mStr);
                            const rev = bookings.filter((b) => { const ym=getYM(b.date); return ym&&ym.y===parseInt(y)&&ym.m===mIdx&&(b.paiement==="Payé"||b.paiement==="Avance"); }).reduce((s,b)=>s+(b.paiement==="Payé"?b.prix:(b.avance||0)),0);
                            const dep = depByKey[k] || 0;
                            yearRev += rev; yearDep += dep;
                            const net = rev - dep;
                            const isEven = i % 2 === 0;
                            rows.push(
                              <tr key={k} className={isEven ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-3 text-gray-500 text-sm">{year}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{moisFR[mIdx]}</td>
                                <td className="px-4 py-3 text-right font-semibold text-green-700">{rev > 0 ? rev.toLocaleString("fr-FR") + " DT" : <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-3 text-right font-semibold text-red-600">{dep > 0 ? dep.toLocaleString("fr-FR") + " DT" : <span className="text-gray-300">—</span>}</td>
                                <td className={`px-4 py-3 text-right font-bold ${net >= 0 ? "text-emerald-600" : "text-red-700"}`}>{net.toLocaleString("fr-FR")} DT</td>
                              </tr>
                            );
                          });
                          rows.push(
                            <tr key={`total-${year}`} className="bg-gray-800 text-white font-bold">
                              <td className="px-4 py-3 text-white">{year}</td>
                              <td className="px-4 py-3 text-white uppercase tracking-wide text-xs">Total annuel</td>
                              <td className="px-4 py-3 text-right text-green-300">{yearRev.toLocaleString("fr-FR")} DT</td>
                              <td className="px-4 py-3 text-right text-red-300">{yearDep.toLocaleString("fr-FR")} DT</td>
                              <td className={`px-4 py-3 text-right font-bold ${(yearRev-yearDep)>=0?"text-emerald-300":"text-red-300"}`}>{(yearRev-yearDep).toLocaleString("fr-FR")} DT</td>
                            </tr>
                          );
                          // Séparateur entre années
                          if (yi < Object.keys(yearGroups).length - 1)
                            rows.push(<tr key={`sep-${year}`}><td colSpan={5} className="py-1 bg-gray-100" /></tr>);
                        });
                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Détail dépenses */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Détail des dépenses incluses dans l'export</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(carburants.reduce((s, c) => s + c.coutTotal, 0))}</p>
                    <p className="text-xs text-orange-700 mt-1">⛽ Carburant ({carburants.length} pleins)</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(maintenances.reduce((s, m) => s + m.cout, 0))}</p>
                    <p className="text-xs text-blue-700 mt-1">🔧 Maintenance ({maintenances.length} interventions)</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{formatCurrency(assurances.reduce((s, a) => s + a.cout, 0))}</p>
                    <p className="text-xs text-indigo-700 mt-1">🛡️ Assurances ({assurances.length} contrats)</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(vignettes.reduce((s, v) => s + v.cout, 0))}</p>
                    <p className="text-xs text-yellow-700 mt-1">📋 Vignettes ({vignettes.length} années)</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Le fichier Excel contient 3 feuilles : <strong>Revenus</strong> (une ligne par réservation encaissée),
                <strong> Dépenses</strong> (carburant, maintenance, assurance, vignette), et
                <strong> Récapitulatif</strong> (tableau mensuel avec bénéfice net — prêt pour la déclaration fiscale).
              </p>
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">🔧 Maintenance</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-rose-700">📋 Plan de Maintenance Recommandé BMW B48B20C</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-rose-50">
                        <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Kilométrage</th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenancePlan.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-900">{item.kilometrage.toLocaleString()} km</td>
                          <td className="border border-gray-300 px-4 py-2"><Badge variant="default">{item.type}</Badge></td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {stats.dernierKilometrage && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">🚗 Kilométrage actuel</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.dernierKilometrage.toLocaleString()} km</p>
                    <p className="text-xs text-blue-400 mt-1">Dernier enregistrement (carburant ou maintenance)</p>
                  </div>
                  {maintenancePlan.map((plan) => {
                    const restant = plan.kilometrage - (stats.dernierKilometrage % plan.kilometrage);
                    const pct = Math.round(((plan.kilometrage - restant) / plan.kilometrage) * 100);
                    return (
                      <div key={plan.type} className={`rounded-2xl p-5 border ${restant < 1000 ? "bg-red-50 border-red-200" : restant < 3000 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${restant < 1000 ? "text-red-500" : restant < 3000 ? "text-amber-500" : "text-gray-400"}`}>{plan.type}</p>
                        <p className={`text-xl font-bold ${restant < 1000 ? "text-red-700" : restant < 3000 ? "text-amber-700" : "text-gray-700"}`}>
                          {restant < 0 ? "⚠️ Dépassé" : `Dans ${restant.toLocaleString()} km`}
                        </p>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <div className={`h-full rounded-full ${restant < 1000 ? "bg-red-500" : restant < 3000 ? "bg-amber-500" : "bg-blue-400"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Maintenance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label><input type="date" value={newMaintenance.date} onChange={(e) => setNewMaintenance({ ...newMaintenance, date: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage *</label><input type="number" placeholder="Ex: 25000" value={newMaintenance.kilometrage} onChange={(e) => setNewMaintenance({ ...newMaintenance, kilometrage: e.target.value })} className={inputClass} /></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select value={newMaintenance.type} onChange={(e) => setNewMaintenance({ ...newMaintenance, type: e.target.value })} className={inputClass}>
                      <option value="">-- Choisir --</option>
                      {["Vidange","Filtres","Freins","Distribution","Révision","Pneus","Autre"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût en DT" value={newMaintenance.cout} onChange={(e) => setNewMaintenance({ ...newMaintenance, cout: e.target.value })} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input type="text" placeholder="Détails" value={newMaintenance.description} onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })} className={inputClass} /></div>
                </div>
                <button onClick={handleAddMaintenance} className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">🔧 Ajouter</button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({maintenances.length})</h3>
                {maintenances.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune maintenance</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead><tr className="bg-gray-50">{["Date","Km","Type","Description","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                      <tbody>
                        {maintenances.sort((a, b) => new Date(b.date) - new Date(a.date)).map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.date}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.kilometrage?.toLocaleString()} km</td>
                            <td className="border border-gray-300 px-4 py-2"><Badge variant="default">{m.type}</Badge></td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{m.description || "-"}</td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(m.cout)}</td>
                            <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteMaintenance(m.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={4} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(maintenances.reduce((s, m) => s + m.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASSURANCES TAB */}
          {activeTab === "assurances" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">🛡️ Assurances</h2>
              <AllReminders bookings={bookings} assurances={assurances} onSelectBooking={(booking) => { setEditBooking(booking); setEditBookingStops(booking.trajetStops || [booking.trajet || "Tunis"]); }} />
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Assurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Compagnie *</label><input type="text" placeholder="Nom" value={newAssurance.compagnie} onChange={(e) => setNewAssurance({ ...newAssurance, compagnie: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">N° Contrat</label><input type="text" placeholder="Numéro" value={newAssurance.numeroContrat} onChange={(e) => setNewAssurance({ ...newAssurance, numeroContrat: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût" value={newAssurance.cout} onChange={(e) => setNewAssurance({ ...newAssurance, cout: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Début *</label><input type="date" value={newAssurance.dateDebut} onChange={(e) => setNewAssurance({ ...newAssurance, dateDebut: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Fin *</label><input type="date" value={newAssurance.dateFin} onChange={(e) => setNewAssurance({ ...newAssurance, dateFin: e.target.value })} className={inputClass} /></div>
                </div>
                <button onClick={handleAddAssurance} className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">🛡️ Ajouter</button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({assurances.length})</h3>
                {assurances.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune assurance</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead><tr className="bg-gray-50">{["Compagnie","N° Contrat","Début","Fin","Statut","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                      <tbody>
                        {assurances.map((a) => {
                          const isActive = new Date(a.dateFin) >= new Date();
                          return (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">{a.compagnie}</td>
                              <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.numeroContrat || "-"}</td>
                              <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.dateDebut}</td>
                              <td className="border border-gray-300 px-4 py-2 text-gray-700">{a.dateFin}</td>
                              <td className="border border-gray-300 px-4 py-2"><Badge variant={isActive ? "success" : "destructive"}>{isActive ? "Active" : "Expirée"}</Badge></td>
                              <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(a.cout)}</td>
                              <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteAssurance(a.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={5} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(assurances.reduce((s, a) => s + a.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIGNETTES TAB */}
          {activeTab === "vignettes" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">📋 Vignettes</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter une Vignette</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Année *</label><input type="number" value={newVignette.annee} onChange={(e) => setNewVignette({ ...newVignette, annee: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Coût (DT) *</label><input type="number" placeholder="Coût" value={newVignette.cout} onChange={(e) => setNewVignette({ ...newVignette, cout: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de Paiement</label><input type="date" value={newVignette.datePaiement} onChange={(e) => setNewVignette({ ...newVignette, datePaiement: e.target.value })} className={inputClass} /></div>
                </div>
                <button onClick={handleAddVignette} className="mt-4 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700">📋 Ajouter</button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({vignettes.length})</h3>
                {vignettes.length === 0 ? <p className="text-gray-500 text-center py-8">Aucune vignette</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead><tr className="bg-gray-50">{["Année","Date Paiement","Coût","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                      <tbody>
                        {vignettes.sort((a, b) => b.annee - a.annee).map((v) => (
                          <tr key={v.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-bold text-gray-900">{v.annee}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{v.datePaiement}</td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(v.cout)}</td>
                            <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteVignette(v.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={2} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total :</td><td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(vignettes.reduce((s, v) => s + v.cout, 0))}</td><td className="border border-gray-300 px-4 py-2"></td></tr></tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CARBURANT TAB */}
          {activeTab === "carburant" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">⛽ Carburant</h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Ajouter un Plein</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label><input type="date" value={newCarburant.date} onChange={(e) => setNewCarburant({ ...newCarburant, date: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantité (L) *</label><input type="number" step="0.1" placeholder="Ex: 45.5" value={newCarburant.quantite} onChange={(e) => setNewCarburant({ ...newCarburant, quantite: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix/Litre (DT) *</label><input type="number" step="0.001" placeholder="Ex: 2.350" value={newCarburant.prixLitre} onChange={(e) => setNewCarburant({ ...newCarburant, prixLitre: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage *</label><input type="number" placeholder="Ex: 15000" value={newCarburant.kilometrage} onChange={(e) => setNewCarburant({ ...newCarburant, kilometrage: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Station</label><input type="text" placeholder="Nom de la station" value={newCarburant.station} onChange={(e) => setNewCarburant({ ...newCarburant, station: e.target.value })} className={inputClass} /></div>
                  {newCarburant.quantite && newCarburant.prixLitre && (
                    <div className="flex items-end">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full">
                        <p className="text-sm text-green-700">Coût total estimé :</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(newCarburant.quantite) * parseFloat(newCarburant.prixLitre))}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={handleAddCarburant} className="mt-4 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700">⛽ Ajouter</button>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historique ({carburants.length})</h3>
                {carburants.length === 0 ? <p className="text-gray-500 text-center py-8">Aucun plein</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead><tr className="bg-gray-50">{["Date","Km","Qté","Prix/L","Station","Total","Action"].map((h) => <th key={h} className="border border-gray-300 px-4 py-2 text-left text-gray-700">{h}</th>)}</tr></thead>
                      <tbody>
                        {carburants.sort((a, b) => new Date(b.date) - new Date(a.date)).map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.date}</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.kilometrage?.toLocaleString()} km</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.quantite} L</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.prixLitre} DT</td>
                            <td className="border border-gray-300 px-4 py-2 text-gray-700">{c.station || "-"}</td>
                            <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">{formatCurrency(c.coutTotal)}</td>
                            <td className="border border-gray-300 px-4 py-2"><button onClick={() => handleDeleteCarburant(c.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Supprimer</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="border border-gray-300 px-4 py-2 text-gray-700">Total : {carburants.reduce((s, c) => s + c.quantite, 0).toFixed(1)} L</td>
                          <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right text-gray-700">Total coût :</td>
                          <td className="border border-gray-300 px-4 py-2 text-red-600">{formatCurrency(carburants.reduce((s, c) => s + c.coutTotal, 0))}</td>
                          <td className="border border-gray-300 px-4 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EDIT MODAL */}
          {editBooking && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setEditBooking(null)}>
              <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Modifier la réservation</h2>
                    <button onClick={() => setEditBooking(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>

                  <div>
                    <MultiStopSelector stops={editBookingStops} onChange={setEditBookingStops} />
                    <div className="mt-3 flex flex-wrap items-center gap-3 bg-rose-50 rounded-lg px-4 py-3 border border-rose-100">
                      <span className="text-sm text-rose-700 font-medium">Nouveau prix estimé :</span>
                      <span className="text-xl font-bold text-rose-600">
                        {formatCurrency(calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0).prix)}
                      </span>
                      <span className="text-xs text-rose-500">
                        ({calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0).distance} km)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Client</label><input value={editBooking.client} onChange={(e) => setEditBooking({ ...editBooking, client: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={editBooking.phone || ""} onChange={(e) => setEditBooking({ ...editBooking, phone: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={editBooking.date} onChange={(e) => setEditBooking({ ...editBooking, date: e.target.value })} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Heure</label><input type="time" value={editBooking.heure} onChange={(e) => setEditBooking({ ...editBooking, heure: e.target.value })} className={inputClass} /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avance (DT)</label>
                      <div className="flex gap-2">
                        <input type="number" value={editBooking.avance || 0} onChange={(e) => setEditBooking({ ...editBooking, avance: Number(e.target.value) })} className={inputClass} />
                        <button
                          type="button"
                          title={`Calculer ${Math.round(ACOMPTE_PERCENTAGE * 100)}% du prix total`}
                          onClick={() => {
                            const { prix } = calculateTotalPrice(editBookingStops, editBooking.retour, editBooking.shooting ? editBooking.shootingHeures : 0);
                            setEditBooking({ ...editBooking, avance: calculateAcompte(prix) });
                          }}
                          className="shrink-0 px-3 py-2 text-xs font-medium bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 whitespace-nowrap"
                        >
                          {Math.round(ACOMPTE_PERCENTAGE * 100)}%
                        </button>
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut Paiement</label>
                      <select value={editBooking.paiement} onChange={(e) => handleEditBookingPaiementChange(e.target.value)} className={inputClass}>
                        {PAIEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="edit-retour" checked={editBooking.retour}
                        onChange={(e) => setEditBooking({ ...editBooking, retour: e.target.checked })} className="rounded border-gray-300" />
                      <label htmlFor="edit-retour" className="text-sm font-medium text-gray-700 cursor-pointer">Avec retour (+100 DT)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="edit-shooting" checked={!!editBooking.shooting}
                        onChange={(e) => setEditBooking({ ...editBooking, shooting: e.target.checked, shootingHeures: e.target.checked ? (editBooking.shootingHeures || 1) : editBooking.shootingHeures })} className="rounded border-gray-300" />
                      <label htmlFor="edit-shooting" className="text-sm font-medium text-gray-700 cursor-pointer">📸 Shooting photo/vidéo (50 DT/h)</label>
                    </div>
                    {editBooking.shooting && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'heures de shooting</label>
                        <input type="number" min="0.5" step="0.5" value={editBooking.shootingHeures || 1}
                          onChange={(e) => setEditBooking({ ...editBooking, shootingHeures: Math.max(0, Number(e.target.value)) })}
                          className={inputClass} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <h3 className="md:col-span-2 text-lg font-semibold text-rose-600">💍 Détails</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement du Marié</label>
                      <input type="text" value={editBooking.lieuMarie || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuMarie: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 Emplacement de la Mariée</label>
                      <input type="text" value={editBooking.lieuMariee || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuMariee: e.target.value })} className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">🎪 Salle des Fêtes</label>
                      <input type="text" value={editBooking.salleFetes || ""} onChange={(e) => setEditBooking({ ...editBooking, salleFetes: e.target.value })} className={inputClass} />
                    </div>
                    {editBooking.retour && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Lieu du Retour</label>
                        <input type="text" value={editBooking.lieuRetour || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuRetour: e.target.value })} className={inputClass} />
                      </div>
                    )}
                    {editBooking.shooting && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">📸 Lieu du Shooting</label>
                        <input type="text" value={editBooking.lieuShooting || ""} onChange={(e) => setEditBooking({ ...editBooking, lieuShooting: e.target.value })} className={inputClass} />
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                      <textarea value={editBooking.commentaires || ""} onChange={(e) => setEditBooking({ ...editBooking, commentaires: e.target.value })} className={`${inputClass} h-20`} />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={() => setEditBooking(null)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Annuler</button>
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-md hover:from-rose-700 hover:to-amber-700">Enregistrer</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {notification && (
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
          )}
        </div>
      </main>
    </div>
  );
}
