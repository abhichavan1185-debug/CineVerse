import datetime
import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cinemas.models import Cinema, City, District, Screen, SeatCategory
from apps.cinemas.services import generate_exact_200_seats_for_screen
from apps.coupons.models import Coupon
from apps.events.models import Event, EventSchedule, TicketTier, Venue
from apps.food.models import FoodItem
from apps.movies.models import Genre, Language, Movie, Person
from apps.shows.models import Show, ShowSeat, ShowSeatPrice
from apps.users.models import Profile

User = get_user_model()


class Command(BaseCommand):
    help = "Populates CineVerse demo data: real movies, Maharashtra cinemas, exact 200-seat screens, shows, food, coupons, and admin accounts."

    def handle(self, *args, **options):
        self.stdout.write("Starting CineVerse comprehensive database seeding...")

        # 1. Admin & Test Users
        admin_user, _ = User.objects.get_or_create(
            email="admin@cineverse.in",
            defaults={
                "username": "admin",
                "is_staff": True,
                "is_superuser": True,
                "is_admin_user": True,
                "is_email_verified": True,
                "is_active_account": True,
            },
        )
        admin_user.set_password("admin12345")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.is_admin_user = True
        admin_user.save()
        Profile.objects.get_or_create(user=admin_user, defaults={"full_name": "CineVerse Admin", "preferred_city": "Mumbai"})

        demo_user, _ = User.objects.get_or_create(
            email="user@cineverse.in",
            defaults={
                "username": "demo_user",
                "is_email_verified": True,
                "is_active_account": True,
            },
        )
        demo_user.set_password("user12345")
        demo_user.save()
        Profile.objects.get_or_create(user=demo_user, defaults={"full_name": "Abhijeet Chavan", "preferred_city": "Pune"})

        # 2. Maharashtra Geography: 36 Districts & Comprehensive Cities
        district_names = [
            "Ahmednagar / Ahilyanagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana",
            "Chandrapur", "Chhatrapati Sambhajinagar", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
            "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur",
            "Nanded", "Nandurbar", "Nashik", "Dharashiv / Osmanabad", "Palghar", "Parbhani",
            "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane",
            "Wardha", "Washim", "Yavatmal",
        ]
        districts = {name: District.objects.get_or_create(name=name)[0] for name in district_names}

        city_districts = {
            "Mumbai": "Mumbai City",
            "Andheri": "Mumbai Suburban",
            "Bandra": "Mumbai Suburban",
            "Pune": "Pune",
            "Nagpur": "Nagpur",
            "Nashik": "Nashik",
            "Chhatrapati Sambhajinagar": "Chhatrapati Sambhajinagar",
            "Kolhapur": "Kolhapur",
            "Solapur": "Solapur",
            "Thane": "Thane",
            "Navi Mumbai": "Thane",
            "Kalyan": "Thane",
            "Vasai-Virar": "Palghar",
            "Panvel": "Raigad",
            "Nanded": "Nanded",
            "Amravati": "Amravati",
            "Jalgaon": "Jalgaon",
            "Akola": "Akola",
            "Latur": "Latur",
            "Dhule": "Dhule",
            "Ahmednagar": "Ahmednagar / Ahilyanagar",
            "Ratnagiri": "Ratnagiri",
            "Sangli": "Sangli",
            "Satara": "Satara",
            "Beed": "Beed",
            "Parbhani": "Parbhani",
            "Jalna": "Jalna",
            "Chandrapur": "Chandrapur",
            "Gondia": "Gondia",
            "Wardha": "Wardha",
            "Yavatmal": "Yavatmal",
            "Dharashiv": "Dharashiv / Osmanabad",
            "Palghar": "Palghar",
            "Alibag": "Raigad",
            "Bhandara": "Bhandara",
            "Buldhana": "Buldhana",
            "Washim": "Washim",
            "Hingoli": "Hingoli",
            "Gadchiroli": "Gadchiroli",
            "Oros": "Sindhudurg",
        }

        popular_cities = {"Mumbai", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar", "Kolhapur", "Thane", "Navi Mumbai", "Solapur"}
        cities = {}
        for city_name, district_name in city_districts.items():
            city, _ = City.objects.get_or_create(
                name=city_name,
                defaults={"district": districts[district_name], "is_popular": city_name in popular_cities},
            )
            cities[city_name] = city

        # 3. Genres & Languages
        genre_names = [
            "Action", "Drama", "Comedy", "Thriller", "Sci-Fi", "Romance",
            "Horror", "Fantasy", "Animation", "Documentary", "Mystery",
            "Family", "Crime", "Adventure",
        ]
        genres = {n: Genre.objects.get_or_create(name=n)[0] for n in genre_names}

        lang_specs = [
            ("Marathi", "mr"), ("Hindi", "hi"), ("English", "en"),
            ("Telugu", "te"), ("Tamil", "ta"), ("Malayalam", "ml"), ("Kannada", "kn"),
            ("Hindi (Dubbed)", "hi-dub"), ("Tamil (Dubbed)", "ta-dub"),
        ]
        languages = {n: Language.objects.get_or_create(name=n, code=c)[0] for n, c in lang_specs}

        # 4. Seat Categories: Platinum (0) and Gold (1)
        categories = {
            "Platinum": SeatCategory.objects.get_or_create(name="Platinum", defaults={"display_order": 0})[0],
            "Gold": SeatCategory.objects.get_or_create(name="Gold", defaults={"display_order": 1})[0],
        }

        # 5. Realistic Movie Catalog
        # Featuring genuine blockbusters in Marathi, Hindi, English, Telugu, Tamil
        catalog_specs = [
            # MARATHI
            {
                "title": "Baipan Bhaari Deva",
                "slug": "baipan-bhaari-deva",
                "poster_url": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Six estranged sisters reunite in Pune to participate in a traditional Mangalagaur dance competition, rediscovering their unbreakable sisterhood and personal strengths.",
                "duration_minutes": 139,
                "certificate": "U",
                "release_date": timezone.now().date() - datetime.timedelta(days=20),
                "status": "now_showing",
                "average_rating": Decimal("9.2"),
                "review_count": 18450,
                "genres": ["Drama", "Comedy", "Family"],
                "languages": ["Marathi"],
                "directors": ["Kedar Shinde"],
                "actors": ["Rohini Hattangadi", "Vandana Gupte", "Sukanya Kulkarni", "Deepa Parab"],
            },
            {
                "title": "Navra Maza Navsacha 2",
                "slug": "navra-maza-navsacha-2",
                "poster_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "A hilarious journey to fulfilling a vow at Ganpatipule turns into a rollercoaster comedy of errors across Maharashtra express trains.",
                "duration_minutes": 132,
                "certificate": "U",
                "release_date": timezone.now().date() - datetime.timedelta(days=12),
                "status": "now_showing",
                "average_rating": Decimal("8.8"),
                "review_count": 9200,
                "genres": ["Comedy", "Adventure", "Family"],
                "languages": ["Marathi"],
                "directors": ["Sachin Pilgaonkar"],
                "actors": ["Sachin Pilgaonkar", "Supriya Pilgaonkar", "Swapnil Joshi", "Hemal Ingle"],
            },
            {
                "title": "Gharat Ganpati",
                "slug": "gharat-ganpati",
                "poster_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "The Konkan family tradition of welcoming Lord Ganesha brings generations together amidst heartfelt drama, laughter, and cultural nostalgia.",
                "duration_minutes": 128,
                "certificate": "U",
                "release_date": timezone.now().date() - datetime.timedelta(days=5),
                "status": "now_showing",
                "average_rating": Decimal("9.0"),
                "review_count": 6400,
                "genres": ["Drama", "Family"],
                "languages": ["Marathi"],
                "directors": ["Navjyot Bandiwadekar"],
                "actors": ["Nikita Dutta", "Bhushan Pradhan", "Ashvini Bhave", "Ajinkya Deo"],
            },
            {
                "title": "Ved",
                "slug": "ved-marathi",
                "poster_url": "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "A heart-wrenching romantic sports drama of unrequited love, second chances, and deep emotional redemption in the heart of Mumbai.",
                "duration_minutes": 148,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=45),
                "status": "now_showing",
                "average_rating": Decimal("8.9"),
                "review_count": 22000,
                "genres": ["Romance", "Drama"],
                "languages": ["Marathi"],
                "directors": ["Riteish Deshmukh"],
                "actors": ["Riteish Deshmukh", "Genelia Deshmukh", "Jiya Shankar", "Ashok Saraf"],
            },
            # HINDI
            {
                "title": "Stree 2: Sarkate Ka Aatank",
                "slug": "stree-2",
                "poster_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "The town of Chanderi is haunted once more by a headless monster named Sarkata. Vicky and his loyal gang must join forces with Stree to save the town.",
                "duration_minutes": 147,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=15),
                "status": "now_showing",
                "average_rating": Decimal("9.1"),
                "review_count": 48200,
                "genres": ["Comedy", "Horror"],
                "languages": ["Hindi"],
                "directors": ["Amar Kaushik"],
                "actors": ["Rajkummar Rao", "Shraddha Kapoor", "Pankaj Tripathi", "Abhishek Banerjee"],
            },
            {
                "title": "Singham Again",
                "slug": "singham-again",
                "poster_url": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Bajirao Singham returns for his most perilous mission yet, bringing together an all-star police universe across the country to defeat an international syndicate.",
                "duration_minutes": 160,
                "certificate": "UA",
                "release_date": timezone.now().date() + datetime.timedelta(days=10),
                "status": "coming_soon",
                "average_rating": Decimal("9.4"),
                "review_count": 31000,
                "genres": ["Action", "Crime", "Thriller"],
                "languages": ["Hindi"],
                "directors": ["Rohit Shetty"],
                "actors": ["Ajay Devgn", "Kareena Kapoor Khan", "Akshay Kumar", "Ranveer Singh", "Deepika Padukone"],
            },
            {
                "title": "Bhool Bhulaiyaa 3",
                "slug": "bhool-bhulaiyaa-3",
                "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Rooh Baba returns to confront the original Manjulika inside the royal chambers of West Bengal in this spine-tingling horror comedy extravaganza.",
                "duration_minutes": 152,
                "certificate": "UA",
                "release_date": timezone.now().date() + datetime.timedelta(days=18),
                "status": "coming_soon",
                "average_rating": Decimal("8.9"),
                "review_count": 14500,
                "genres": ["Comedy", "Horror", "Mystery"],
                "languages": ["Hindi"],
                "directors": ["Anees Bazmee"],
                "actors": ["Kartik Aaryan", "Vidya Balan", "Madhuri Dixit", "Triptii Dimri"],
            },
            {
                "title": "Jawan",
                "slug": "jawan",
                "poster_url": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "A high-octane action thriller outlining the emotional journey of a prison jailer who sets out to rectify the corrupt evils in society.",
                "duration_minutes": 169,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=60),
                "status": "now_showing",
                "average_rating": Decimal("8.7"),
                "review_count": 65000,
                "genres": ["Action", "Thriller"],
                "languages": ["Hindi", "Tamil", "Telugu"],
                "directors": ["Atlee"],
                "actors": ["Shah Rukh Khan", "Nayanthara", "Vijay Sethupathi", "Deepika Padukone"],
            },
            # ENGLISH / HOLLYWOOD
            {
                "title": "Deadpool & Wolverine",
                "slug": "deadpool-and-wolverine",
                "poster_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Wade Wilson teams up with a reluctant, battle-hardened Wolverine on a multi-universe mission that changes the Marvel Cinematic Universe forever.",
                "duration_minutes": 127,
                "certificate": "A",
                "release_date": timezone.now().date() - datetime.timedelta(days=25),
                "status": "now_showing",
                "average_rating": Decimal("9.3"),
                "review_count": 52000,
                "genres": ["Action", "Comedy", "Sci-Fi"],
                "languages": ["English", "Hindi (Dubbed)"],
                "directors": ["Shawn Levy"],
                "actors": ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin", "Matthew Macfadyen"],
            },
            {
                "title": "Dune: Part Two",
                "slug": "dune-part-two",
                "poster_url": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and destiny.",
                "duration_minutes": 166,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=40),
                "status": "now_showing",
                "average_rating": Decimal("9.5"),
                "review_count": 41000,
                "genres": ["Sci-Fi", "Adventure", "Action"],
                "languages": ["English", "Hindi (Dubbed)"],
                "directors": ["Denis Villeneuve"],
                "actors": ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
            },
            {
                "title": "Gladiator II",
                "slug": "gladiator-ii",
                "poster_url": "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Years after witnessing the death of Maximus, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who lead Rome.",
                "duration_minutes": 150,
                "certificate": "A",
                "release_date": timezone.now().date() + datetime.timedelta(days=22),
                "status": "coming_soon",
                "average_rating": Decimal("9.1"),
                "review_count": 8900,
                "genres": ["Action", "Drama", "Adventure"],
                "languages": ["English", "Hindi (Dubbed)"],
                "directors": ["Ridley Scott"],
                "actors": ["Paul Mescal", "Pedro Pascal", "Denzel Washington", "Connie Nielsen"],
            },
            # TELUGU
            {
                "title": "Kalki 2898 AD",
                "slug": "kalki-2898-ad",
                "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "In a post-apocalyptic dystopia in the year 2898 AD, Ashwatthama protects the carrier of a divine child who is prophesied to bring back truth and light.",
                "duration_minutes": 181,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=35),
                "status": "now_showing",
                "average_rating": Decimal("9.0"),
                "review_count": 59000,
                "genres": ["Sci-Fi", "Action", "Fantasy"],
                "languages": ["Telugu", "Hindi (Dubbed)", "Tamil (Dubbed)"],
                "directors": ["Nag Ashwin"],
                "actors": ["Prabhas", "Amitabh Bachchan", "Kamal Haasan", "Deepika Padukone"],
            },
            {
                "title": "Pushpa 2: The Rule",
                "slug": "pushpa-2-the-rule",
                "poster_url": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Pushpa Raj establishes undisputed dominance over the red sanders syndicate, clashing fiercely with SP Bhanwar Singh Shekhawat in an explosive showdown.",
                "duration_minutes": 175,
                "certificate": "UA",
                "release_date": timezone.now().date() + datetime.timedelta(days=14),
                "status": "coming_soon",
                "average_rating": Decimal("9.6"),
                "review_count": 72000,
                "genres": ["Action", "Crime", "Thriller"],
                "languages": ["Telugu", "Hindi (Dubbed)", "Tamil (Dubbed)"],
                "directors": ["Sukumar"],
                "actors": ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil"],
            },
            {
                "title": "Devara: Part 1",
                "slug": "devara-part-1",
                "poster_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "An epic sea-bound saga of courage, brotherhood, and raw vengeance spanning decades along India's coastal frontiers.",
                "duration_minutes": 170,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=8),
                "status": "now_showing",
                "average_rating": Decimal("8.9"),
                "review_count": 38000,
                "genres": ["Action", "Drama"],
                "languages": ["Telugu", "Hindi (Dubbed)"],
                "directors": ["Koratala Siva"],
                "actors": ["N.T. Rama Rao Jr.", "Janhvi Kapoor", "Saif Ali Khan"],
            },
            # TAMIL
            {
                "title": "The Greatest of All Time (GOAT)",
                "slug": "the-greatest-of-all-time",
                "poster_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
                "banner_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
                "trailer_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "A retired hostage negotiator and field agent from the Special Anti-Terrorist Squad is summoned back when a ghost from his past strikes his family.",
                "duration_minutes": 178,
                "certificate": "UA",
                "release_date": timezone.now().date() - datetime.timedelta(days=10),
                "status": "now_showing",
                "average_rating": Decimal("8.8"),
                "review_count": 44000,
                "genres": ["Action", "Sci-Fi", "Thriller"],
                "languages": ["Tamil", "Hindi (Dubbed)", "Telugu"],
                "directors": ["Venkat Prabhu"],
                "actors": ["Vijay", "Prashanth", "Prabhu Deva", "Sneha"],
            },
        ]

        seeded_movies = []
        for spec in catalog_specs:
            movie, _ = Movie.objects.get_or_create(
                slug=spec["slug"],
                defaults=dict(
                    title=spec["title"],
                    poster_url=spec["poster_url"],
                    banner_url=spec["banner_url"],
                    trailer_url=spec["trailer_url"],
                    description=spec["description"],
                    duration_minutes=spec["duration_minutes"],
                    certificate=spec["certificate"],
                    release_date=spec["release_date"],
                    status=spec["status"],
                    average_rating=spec["average_rating"],
                    review_count=spec["review_count"],
                ),
            )
            movie.genres.set([genres[g] for g in spec["genres"] if g in genres])
            movie.languages.set([languages[l] for l in spec["languages"] if l in languages])

            # Cast & directors
            for d in spec.get("directors", []):
                person, _ = Person.objects.get_or_create(name=d, role="director")
                movie.directors.add(person)
            for a in spec.get("actors", []):
                person, _ = Person.objects.get_or_create(name=a, role="actor")
                movie.cast.add(person)

            seeded_movies.append(movie)

        now_showing_movies = [m for m in seeded_movies if m.status == "now_showing"]

        # 6. Maharashtra Cinemas & Multi-Screen Hubs
        cinema_specs = [
            ("CineVerse IMAX Palladium", cities["Mumbai"], "High Street Phoenix, Lower Parel, Mumbai", ["Parking", "Dolby Atmos", "Food Court", "IMAX", "Recliner", "Wheelchair Access", "Air Conditioning"]),
            ("CineVerse Premiere Bandra", cities["Mumbai"], "Linking Road, Bandra West, Mumbai", ["Parking", "Dolby Atmos", "Recliner", "Food Court", "Air Conditioning"]),
            ("CineVerse Metro Andheri", cities["Andheri"], "Veera Desai Road, Andheri West, Mumbai", ["Parking", "Dolby Atmos", "3D", "Food Court", "Air Conditioning"]),
            ("CineVerse Phoenix Marketcity", cities["Pune"], "Viman Nagar, Pune", ["Parking", "Dolby Atmos", "IMAX", "Recliner", "Food Court", "Wheelchair Access", "Air Conditioning"]),
            ("CineVerse Westend Aundh", cities["Pune"], "Westend Mall, Aundh, Pune", ["Parking", "Dolby Atmos", "3D", "Food Court", "Air Conditioning"]),
            ("CineVerse Kothrud Multiplex", cities["Pune"], "Karve Road, Kothrud, Pune", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Empress Mall", cities["Nagpur"], "Sir Bezonji Mehta Road, Nagpur", ["Parking", "Dolby Atmos", "IMAX", "Food Court", "Air Conditioning"]),
            ("CineVerse Dharampeth", cities["Nagpur"], "West High Court Road, Dharampeth, Nagpur", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse City Centre Nashik", cities["Nashik"], "Untwadi Road, Lavate Nagar, Nashik", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Prozone Mall", cities["Chhatrapati Sambhajinagar"], "MIDC Industrial Area, Chhatrapati Sambhajinagar", ["Parking", "Dolby Atmos", "Food Court", "3D", "Air Conditioning"]),
            ("CineVerse DYP City Mall", cities["Kolhapur"], "Old Pune-Bangalore Road, Kolhapur", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Oasis Mall", cities["Solapur"], "Hotgi Road, Solapur", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Viviana", cities["Thane"], "Eastern Express Highway, Thane West", ["Parking", "Dolby Atmos", "IMAX", "Recliner", "Food Court", "Air Conditioning"]),
            ("CineVerse Seawoods Grand", cities["Navi Mumbai"], "Seawoods Station Complex, Navi Mumbai", ["Parking", "Dolby Atmos", "IMAX", "Recliner", "Food Court", "Air Conditioning"]),
            ("CineVerse Metro Junction", cities["Kalyan"], "Netivali, Kalyan East", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Orion Panvel", cities["Panvel"], "Mumbai-Pune Expressway, Panvel", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Tapovan Plaza", cities["Amravati"], "Badnera Road, Amravati", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Khandesh Central", cities["Jalgaon"], "Station Road, Jalgaon", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Coastal Horizon", cities["Ratnagiri"], "Mandvi Beach Road, Ratnagiri", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
            ("CineVerse Guru Gobind Plaza", cities["Nanded"], "Airport Road, Nanded", ["Parking", "Dolby Atmos", "Food Court", "Air Conditioning"]),
        ]

        total_screens_created = 0
        total_shows_created = 0

        for cin_name, city_obj, address, facilities in cinema_specs:
            cinema, _ = Cinema.objects.get_or_create(
                name=cin_name,
                city=city_obj,
                defaults={"address": address, "facilities": facilities, "is_active": True},
            )

            # Create 2 Screens per Cinema: "Screen 1 - Dolby Atmos" and "Screen 2 - Laser 4K"
            for s_idx, screen_name in enumerate(["Screen 1 - Dolby Atmos", "Screen 2 - Laser 4K"], start=1):
                screen, _ = Screen.objects.get_or_create(
                    cinema=cinema,
                    name=screen_name,
                    defaults={"supported_formats": ["2D", "3D"] if s_idx == 1 else ["2D", "IMAX"]},
                )
                # Ensure the EXACT 200 SEATS (80 Platinum, 120 Gold)
                generate_exact_200_seats_for_screen(screen)
                total_screens_created += 1

                # 7. Create Shows for Today, Tomorrow, and Next 3 Days
                showtimes = [
                    (datetime.time(9, 0), datetime.time(11, 45)),
                    (datetime.time(12, 15), datetime.time(15, 0)),
                    (datetime.time(15, 30), datetime.time(18, 15)),
                    (datetime.time(18, 45), datetime.time(21, 30)),
                    (datetime.time(21, 45), datetime.time(0, 30)),
                ]

                for day_offset in range(0, 4):
                    show_date = timezone.now().date() + datetime.timedelta(days=day_offset)
                    # Pick 2-3 showtimes per screen per day
                    chosen_slots = random.sample(showtimes, k=3)
                    for start_t, end_t in chosen_slots:
                        movie = random.choice(now_showing_movies)
                        show, created = Show.objects.get_or_create(
                            screen=screen,
                            date=show_date,
                            start_time=start_t,
                            defaults=dict(
                                movie=movie,
                                end_time=end_t,
                                format=random.choice(screen.supported_formats),
                            ),
                        )
                        if created:
                            total_shows_created += 1
                            # Configure standard pricing: Gold = ₹220, Platinum = ₹350
                            gold_price = Decimal("220.00")
                            plat_price = Decimal("350.00")
                            ShowSeatPrice.objects.get_or_create(show=show, category=categories["Gold"], defaults={"price": gold_price})
                            ShowSeatPrice.objects.get_or_create(show=show, category=categories["Platinum"], defaults={"price": plat_price})

                            # Create ShowSeat rows for all 200 seats
                            all_seats = list(screen.seats.select_related("category").all())
                            # Pre-book ~15% random seats for realistic UI availability
                            prebooked_indices = set(random.sample(range(len(all_seats)), k=len(all_seats) // 7))
                            
                            show_seat_rows = [
                                ShowSeat(
                                    show=show,
                                    seat=st,
                                    price=plat_price if st.category.name == "Platinum" else gold_price,
                                    status="booked" if idx in prebooked_indices else "available",
                                )
                                for idx, st in enumerate(all_seats)
                            ]
                            ShowSeat.objects.bulk_create(show_seat_rows)

        # 8. Food & Beverages
        for name, price, category, img, desc in [
            ("Classic Salted Popcorn (L)", 260, "popcorn", "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80", "Fresh warm salted cinema popcorn tub."),
            ("Caramel Popcorn Tub", 290, "popcorn", "https://images.unsplash.com/photo-1585647347483-22b662174292?w=600&auto=format&fit=crop&q=80", "Crunchy popcorn coated in rich golden caramel glaze."),
            ("Cheese Lava Nachos", 240, "nachos", "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80", "Crispy chips topped with warm jalapeño cheese lava dip."),
            ("Jalapeno Salsa Nachos", 220, "nachos", "https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&auto=format&fit=crop&q=80", "Zesty salsa with sliced jalapenos and seasoned nachos."),
            ("Chilled Pepsi Max (R)", 130, "beverage", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80", "Refreshing zero-sugar cola served ice cold."),
            ("Mineral Water", 50, "water", "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80", "Pure packaged natural mineral water bottle."),
            ("Blockbuster Combo: Popcorn + 2 Drinks", 480, "combo", "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80", "1 Large Tub + 2 Fountain Drinks + Dips."),
            ("Belgian Choco Sundae", 120, "snack", "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80", "Decadent chocolate fudge sundae with nuts."),
        ]:
            FoodItem.objects.get_or_create(
                name=name,
                defaults={"price": price, "category": category, "image_url": img, "description": desc}
            )

        # 9. Offers & Coupons
        for code, title, desc, dtype, dval, min_ord in [
            ("MAHA100", "Flat ₹100 off in Maharashtra", "Exclusive launch offer for Maharashtra cinema lovers!", "flat", 100, 300),
            ("CINE20", "20% off on Movie Tickets", "Save 20% (up to ₹150) on bookings over ₹200.", "percent", 20, 200),
            ("WEEKEND50", "Weekend Bonanza ₹50 off", "Flat ₹50 off for Friday to Sunday shows.", "flat", 50, 0),
        ]:
            Coupon.objects.get_or_create(
                code=code,
                defaults=dict(
                    title=title,
                    description=desc,
                    banner_url="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
                    is_featured=True,
                    discount_type=dtype,
                    discount_value=dval,
                    min_order_amount=min_ord,
                    usage_limit_per_user=2,
                    valid_from=timezone.now(),
                    valid_until=timezone.now() + datetime.timedelta(days=90),
                ),
            )

        self.stdout.write(self.style.SUCCESS(
            f"CineVerse Seeding complete!\n"
            f"- Users: admin@cineverse.in (admin12345), user@cineverse.in (user12345)\n"
            f"- Movies: {len(seeded_movies)} realistic titles (Marathi, Hindi, Hollywood, South)\n"
            f"- Cinemas: {len(cinema_specs)} cinemas across Maharashtra\n"
            f"- Screens: {total_screens_created} screens (each with EXACT 200 seats: 80 Platinum, 120 Gold)\n"
            f"- Shows created: {total_shows_created}"
        ))
