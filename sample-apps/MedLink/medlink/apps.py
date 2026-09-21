from django.apps import AppConfig


class MedlinkConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "medlink"

    def ready(self):
        import medlink.signals