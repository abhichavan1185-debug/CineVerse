import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.food.models import FoodItem

updates = {
    'Classic Popcorn (L)': ('https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80', 'Fresh warm buttery cinema popcorn tub.', 'popcorn'),
    'Classic Salted Popcorn (L)': ('https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80', 'Fresh warm salted cinema popcorn tub.', 'popcorn'),
    'Caramel Popcorn Tub': ('https://images.unsplash.com/photo-1585647347483-22b662174292?w=600&auto=format&fit=crop&q=80', 'Crunchy popcorn coated in rich golden caramel glaze.', 'popcorn'),
    'Cheese Nachos': ('https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80', 'Crisp Mexican tortilla chips with melted cheese sauce.', 'nachos'),
    'Cheese Lava Nachos': ('https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80', 'Crispy chips topped with warm jalapeño cheese lava dip.', 'nachos'),
    'Jalapeno Salsa Nachos': ('https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&auto=format&fit=crop&q=80', 'Zesty salsa with sliced jalapenos and seasoned nachos.', 'nachos'),
    'Cola (R)': ('https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 'Chilled theatre fountain cola served with ice.', 'beverage'),
    'Chilled Pepsi Max (R)': ('https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 'Refreshing zero-sugar cola served ice cold.', 'beverage'),
    'Mineral Water': ('https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80', 'Pure packaged natural mineral water bottle.', 'water'),
    'Combo: Popcorn + 2 Cola': ('https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80', '1 Large Popcorn Tub + 2 Fountain Colas.', 'combo'),
    'Blockbuster Combo: Popcorn + 2 Drinks': ('https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80', '1 Large Tub + 2 Fountain Drinks + Dips.', 'combo'),
    'Choco Bar': ('https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80', 'Crisp chocolate coated vanilla ice cream bar.', 'snack'),
    'Belgian Choco Sundae': ('https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80', 'Decadent chocolate fudge sundae with nuts.', 'snack'),
}

for name, (img, desc, cat) in updates.items():
    cnt = FoodItem.objects.filter(name=name).update(image_url=img, description=desc, category=cat)
    print(f"Updated {name}: {cnt}")

print("Total Food items in DB:", FoodItem.objects.count())
