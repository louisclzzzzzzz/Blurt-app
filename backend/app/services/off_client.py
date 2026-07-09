import httpx

# L'ancien endpoint legacy (world.openfoodfacts.org/cgi/search.pl et
# /api/v2/search) renvoie 503 en pratique (vérifié) — OFF a migré la
# recherche vers ce service dédié ("search-a-licious").
OFF_SEARCH_URL = "https://search.openfoodfacts.org/search"
FIELDS = "code,product_name,brands,nutriments"
HEADERS = {"User-Agent": "VoxApp/0.1 (usage personnel; suivi nutritionnel par dictee vocale)"}


async def search_packaged_food(query: str, limit: int = 5) -> list[dict]:
    """Recherche un produit emballé par nom sur Open Food Facts.

    Un échec réseau/API ne doit jamais faire tomber le pipeline : on retourne
    une liste vide, et l'appelant retombe sur le fallback "demander les
    macros à l'utilisateur" (cf. logique de matching, plan Phase 2).
    """
    params = {"q": query, "page_size": limit, "fields": FIELDS}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OFF_SEARCH_URL, params=params, headers=HEADERS)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return []

    results = []
    for product in data.get("hits", []):
        nutriments = product.get("nutriments") or {}
        energy_kcal = nutriments.get("energy-kcal_100g")
        protein_g = nutriments.get("proteins_100g")
        carbs_g = nutriments.get("carbohydrates_100g")
        fat_g = nutriments.get("fat_100g")
        if None in (energy_kcal, protein_g, carbs_g, fat_g):
            continue  # macros de base incomplètes pour ce produit, on l'ignore
        brands = product.get("brands") or []
        results.append(
            {
                "off_barcode": product.get("code"),
                "name": product.get("product_name") or query,
                "brand": ", ".join(brands) if brands else None,
                "energy_kcal": energy_kcal,
                "protein_g": protein_g,
                "carbs_g": carbs_g,
                "fat_g": fat_g,
                "saturated_fat_g": nutriments.get("saturated-fat_100g"),
                "sugars_g": nutriments.get("sugars_100g"),
                "fiber_g": nutriments.get("fiber_100g"),
                "salt_g": nutriments.get("salt_100g"),
            }
        )
    return results
