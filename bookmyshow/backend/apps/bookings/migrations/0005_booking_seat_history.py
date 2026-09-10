# Generated manually for the booking-seat history correction.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0004_initial"),
        ("shows", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="booking_ref",
            field=models.CharField(editable=False, max_length=20, unique=True),
        ),
        migrations.AlterField(
            model_name="bookingseat",
            name="show_seat",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="booking_seats",
                to="shows.showseat",
            ),
        ),
        migrations.AddConstraint(
            model_name="bookingseat",
            constraint=models.UniqueConstraint(
                fields=("booking", "show_seat"), name="unique_booking_show_seat",
            ),
        ),
    ]
