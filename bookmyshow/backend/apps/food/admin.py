from django.contrib import admin

from .models import FoodItem, FoodOrderItem

admin.site.register(FoodItem)
admin.site.register(FoodOrderItem)
