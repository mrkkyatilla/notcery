RISK_MATRIX_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "likelihood": {"type": "string", "enum": ["low", "medium", "high"]},
                    "description": {"type": "string"},
                    "mitigation": {"type": "string"},
                    "sources": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "severity", "description"],
            },
        },
    },
    "required": ["summary", "risks"],
}

COMPARISON_TABLE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "columns": {"type": "array", "items": {"type": "string"}},
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "cells": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["topic", "cells"],
            },
        },
    },
    "required": ["summary", "columns", "rows"],
}
