from django.contrib import admin

from apps.lab.models import LabChunk, LabFile, LabFolder, LabMessage, LabSession


@admin.register(LabFolder)
class LabFolderAdmin(admin.ModelAdmin):
    list_display = ("path", "workspace", "name")


@admin.register(LabFile)
class LabFileAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "index_status", "kind")


@admin.register(LabChunk)
class LabChunkAdmin(admin.ModelAdmin):
    list_display = ("lab_file", "chunk_index")


@admin.register(LabSession)
class LabSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "user", "title")


@admin.register(LabMessage)
class LabMessageAdmin(admin.ModelAdmin):
    list_display = ("session", "role", "created_at")
