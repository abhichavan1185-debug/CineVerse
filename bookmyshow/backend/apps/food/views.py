from rest_framework import generics, permissions

from .models import FoodItem
from .serializers import FoodItemSerializer


class FoodItemListView(generics.ListAPIView):
    queryset = FoodItem.objects.filter(is_available=True)
    serializer_class = FoodItemSerializer
    permission_classes = [permissions.AllowAny]
