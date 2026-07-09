"""Fuseau horaire assumé pour toute logique dépendant du jour calendaire (repas,
historique). Mono-utilisateur France, pas de profil de fuseau horaire en base."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

ASSUMED_TIMEZONE = ZoneInfo("Europe/Paris")


def day_bounds_utc(day: date) -> tuple[datetime, datetime]:
    """Bornes [début, fin) d'un jour calendaire Europe/Paris, en UTC.

    L'addition timedelta(days=1) se fait en heure locale (arithmétique sur les
    champs calendaires) avant conversion UTC : chaque borne résout son propre
    décalage indépendamment, ce qui reste correct un jour de changement d'heure
    (le jour fait alors 23h ou 25h réelles, comme attendu)."""
    start_local = datetime.combine(day, time.min, tzinfo=ASSUMED_TIMEZONE)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)
