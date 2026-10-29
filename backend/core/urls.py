from django.http import JsonResponse
from django.urls import path
from django.db import connection

def healthz(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return JsonResponse({"status": "ok", "service": "port-command-backend", "domain_api": "not_implemented"})

urlpatterns = [path("healthz/", healthz)]
