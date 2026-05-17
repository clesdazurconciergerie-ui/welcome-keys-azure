import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already used demo
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('has_used_demo, role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Error fetching user data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userData.has_used_demo) {
      return new Response(
        JSON.stringify({ error: 'Demo already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Activate demo mode
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        role: 'demo_user',
        demo_token_issued_at: now.toISOString(),
        demo_token_expires_at: expiresAt.toISOString(),
        has_used_demo: true,
        subscription_status: 'trial_active',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error activating demo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Also add role to user_roles table for security
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          role: 'demo_user',
          assigned_at: now.toISOString(),
        },
        {
          onConflict: 'user_id,role',
          ignoreDuplicates: true,
        }
      );

    if (roleError) {
      console.error('Error adding role to user_roles:', roleError);
      // Don't fail the request, just log the error
    }

    // Create or reactivate demo booklet with full content
    const { data: existingDemoBooklet, error: bookletFetchError } = await supabaseClient
      .from('booklets')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_demo', true)
      .maybeSingle();

    if (bookletFetchError) {
      console.error('Error fetching demo booklet:', bookletFetchError);
    }

    let bookletId: string | null = null;
    let pinCode: string | null = null;

    if (existingDemoBooklet) {
      // Reactivate existing demo booklet
      const { error: updateBookletError } = await supabaseClient
        .from('booklets')
        .update({
          status: 'published',
          demo_expires_at: expiresAt.toISOString()
        })
        .eq('id', existingDemoBooklet.id);

      if (updateBookletError) {
        console.error('Error updating demo booklet:', updateBookletError);
      } else {
        bookletId = existingDemoBooklet.id;
        
        // Get existing pin code
        const { data: existingPin } = await supabaseClient
          .from('pins')
          .select('pin_code')
          .eq('booklet_id', existingDemoBooklet.id)
          .eq('status', 'active')
          .maybeSingle();
        
        pinCode = existingPin?.pin_code || null;
      }
    } else {
      // Create new comprehensive demo booklet
      const { data: newBooklet, error: createBookletError } = await supabaseClient
        .from('booklets')
        .insert({
          user_id: user.id,
          property_name: 'Villa Méditerranée - Démo',
          property_address: '12 Avenue de la Côte d\'Azur, 06000 Nice, France',
          city: 'Nice',
          postcode: '06000',
          country: 'France',
          property_type: 'villa',
          tagline: 'Votre havre de paix face à la mer',
          status: 'published',
          is_demo: true,
          demo_expires_at: expiresAt.toISOString(),
          welcome_message: '🎉 Bienvenue dans votre livret de démonstration !\n\nCe livret complet vous permet de découvrir toutes les fonctionnalités de Wlekom. Explorez les différentes sections pour voir comment vos voyageurs découvriront votre propriété.\n\nVous avez 7 jours pour tester gratuitement toutes les fonctionnalités.',
          check_in_time: '15h00',
          check_out_time: '11h00',
          checkin_procedure: 'Récupérez les clés dans la boîte à clés située à gauche de la porte d\'entrée. Code : 1234A',
          checkout_procedure: 'Déposez les clés dans la boîte à clés et fermez-la bien. Vérifiez que toutes les fenêtres sont fermées.',
          house_rules: '• Respectez le voisinage (calme après 22h)\n• Interdiction de fumer à l\'intérieur\n• Maximum 6 personnes\n• Les animaux ne sont pas acceptés\n• Merci de trier vos déchets',
          emergency_contacts: 'Pompiers : 18\nSAMU : 15\nPolice : 17\nNuméro d\'urgence européen : 112',
          safety_instructions: '• Extincteur dans la cuisine\n• Détecteur de fumée au plafond\n• Coupure générale électrique dans le garage\n• Robinet d\'arrêt d\'eau sous l\'évier',
          parking_info: 'Place de parking privée n°12 dans le parking souterrain. Badge d\'accès dans le tiroir de l\'entrée.',
          cleaning_rules: 'Merci de laisser la maison dans l\'état où vous l\'avez trouvée.',
          sorting_instructions: 'Poubelle jaune : recyclables\nPoubelle verte : ordures ménagères\nPoubelle bleue : verre',
          waste_location: 'Local à poubelles au rez-de-chaussée, à gauche en sortant de l\'ascenseur.',
          google_maps_link: 'https://maps.google.com/?q=Nice,France',
          cover_image_url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200',
          accent_color: '#18c0df',
          background_color: '#ffffff',
          text_color: '#1a1a1a',
          concierge_name: 'Welkom',
          logo_url: '',
          timezone: 'Europe/Paris',
          language: 'fr'
        })
        .select('id')
        .single();

      if (createBookletError) {
        console.error('Error creating demo booklet:', createBookletError);
      } else {
        bookletId = newBooklet.id;

        // Generate and create PIN code
        const generatePin = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let pin = '';
          for (let i = 0; i < 6; i++) {
            pin += chars[Math.floor(Math.random() * chars.length)];
          }
          return pin;
        };

        pinCode = generatePin();
        
        const { error: pinError } = await supabaseClient
          .from('pins')
          .insert({
            booklet_id: bookletId,
            pin_code: pinCode,
            status: 'active'
          });

        if (pinError) {
          console.error('Error creating PIN:', pinError);
        }

        // Add WiFi credentials
        await supabaseClient
          .from('wifi_credentials')
          .insert({
            booklet_id: bookletId,
            has_wifi: true,
            ssid: 'Villa-Mediterranee-5G',
            password: 'DemoWifi2024!'
          });

        // Add contact info
        await supabaseClient
          .from('booklet_contacts')
          .insert({
            booklet_id: bookletId,
            contact_phone: '+33 6 12 34 56 78',
            contact_email: 'contact@welkom.com'
          });

        // Add FAQ entries
        const faqData = [
          {
            booklet_id: bookletId,
            question: 'Comment accéder au Wi-Fi ?',
            answer: 'Le nom du réseau et le mot de passe sont disponibles dans la section Wi-Fi de ce livret. Le routeur se trouve dans le salon.',
            order_index: 0,
            is_favorite: true
          },
          {
            booklet_id: bookletId,
            question: 'Où puis-je me garer ?',
            answer: 'Une place de parking privée vous est réservée dans le parking souterrain (place n°12). Le badge d\'accès se trouve dans le tiroir de l\'entrée.',
            order_index: 1,
            is_favorite: true
          },
          {
            booklet_id: bookletId,
            question: 'Y a-t-il un lave-linge ?',
            answer: 'Oui, le lave-linge se trouve dans la salle de bain. Les capsules de lessive sont sous l\'évier.',
            order_index: 2,
            is_favorite: false
          },
          {
            booklet_id: bookletId,
            question: 'Puis-je faire un check-out tardif ?',
            answer: 'Contactez-nous au +33 6 12 34 56 78 pour vérifier la disponibilité. Un supplément peut s\'appliquer.',
            order_index: 3,
            is_favorite: false
          }
        ];

        await supabaseClient.from('faq').insert(faqData);

        // Add nearby places
        const nearbyPlaces = [
          {
            booklet_id: bookletId,
            name: 'Promenade des Anglais',
            type: 'attraction',
            description: 'Célèbre promenade en bord de mer, idéale pour une balade à vélo ou à pied.',
            distance: '800m',
            maps_link: 'https://maps.google.com/?q=Promenade+des+Anglais+Nice',
            image_url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400'
          },
          {
            booklet_id: bookletId,
            name: 'Vieux Nice',
            type: 'quartier',
            description: 'Centre historique avec ses ruelles pittoresques, boutiques et restaurants authentiques.',
            distance: '1.2km',
            maps_link: 'https://maps.google.com/?q=Vieux+Nice'
          },
          {
            booklet_id: bookletId,
            name: 'Marché Libération',
            type: 'marché',
            description: 'Marché provençal avec produits frais locaux. Ouvert tous les matins sauf le lundi.',
            distance: '400m'
          }
        ];

        await supabaseClient.from('nearby_places').insert(nearbyPlaces);

        // Add restaurants
        const restaurants = [
          {
            booklet_id: bookletId,
            name: 'La Petite Maison',
            cuisine: 'Méditerranéenne',
            price_range: '€€€',
            rating: 4.5,
            phone: '+33 4 93 92 59 59',
            address: '11 Rue Saint-François de Paule, Nice',
            url: 'https://example.com',
            tags: ['Terrasse', 'Réservation conseillée'],
            is_owner_pick: true,
            order_index: 0
          },
          {
            booklet_id: bookletId,
            name: 'Chez Palmyre',
            cuisine: 'Niçoise',
            price_range: '€€',
            rating: 4.3,
            address: '5 Rue Droite, Nice',
            tags: ['Traditionnel', 'Familial'],
            is_owner_pick: false,
            order_index: 1
          }
        ];

        await supabaseClient.from('restaurants').insert(restaurants);

        // Add activities
        const activities = [
          {
            booklet_id: bookletId,
            name: 'Visite guidée du Vieux Nice',
            category: 'Culture',
            duration: '2h',
            price: '25€/personne',
            booking_url: 'https://example.com',
            when_available: ['Tous les jours', 'Matin'],
            is_owner_pick: true,
            order_index: 0
          },
          {
            booklet_id: bookletId,
            name: 'Sortie en kayak',
            category: 'Sport',
            duration: '3h',
            price: '45€/personne',
            age_restrictions: 'À partir de 12 ans',
            when_available: ['Été', 'Après-midi'],
            is_owner_pick: false,
            order_index: 1
          }
        ];

        await supabaseClient.from('activities').insert(activities);

        // Add essentials
        const essentials = [
          {
            booklet_id: bookletId,
            name: 'Pharmacie du Centre',
            type: 'pharmacy',
            address: '15 Avenue Jean Médecin',
            phone: '+33 4 93 87 65 43',
            distance: '300m',
            hours: 'Lun-Sam 8h-20h',
            order_index: 0
          },
          {
            booklet_id: bookletId,
            name: 'Carrefour City',
            type: 'supermarket',
            address: '8 Rue de France',
            distance: '200m',
            hours: '7h-22h tous les jours',
            order_index: 1
          },
          {
            booklet_id: bookletId,
            name: 'Boulangerie Paul',
            type: 'bakery',
            address: '3 Rue Pastorelli',
            distance: '150m',
            hours: '6h30-20h',
            notes: 'Excellent pain et viennoiseries',
            order_index: 2
          }
        ];

        await supabaseClient.from('essentials').insert(essentials);

        // Add transport options
        const transport = [
          {
            booklet_id: bookletId,
            name: 'Tramway Ligne 1',
            type: 'tram',
            distance: '100m',
            instructions: 'Arrêt "Masséna" à 2 min à pied',
            price: '1.50€ le ticket',
            url: 'https://lignes-azur.com',
            order_index: 0
          },
          {
            booklet_id: bookletId,
            name: 'Station Vélos Bleus',
            type: 'bike',
            distance: '50m',
            instructions: 'Station de vélos en libre-service devant la résidence',
            price: 'À partir de 1€/jour',
            order_index: 1
          }
        ];

        await supabaseClient.from('transport').insert(transport);

        console.log('[Demo] Created comprehensive demo booklet with ID:', bookletId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo mode activated',
        expires_at: expiresAt.toISOString(),
        booklet_id: bookletId,
        pin_code: pinCode,
        days_remaining: 7
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in activate-demo function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
