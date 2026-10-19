from rest_framework.pagination import BasePagination
from rest_framework.response import Response
from django.conf import settings


class CappedListPagination(BasePagination):
    """Keeps list endpoints as plain JSON arrays (the frontend expects arrays) but never returns more than
    MAX_LIST_RESULTS rows. Clients may narrow the result with ?limit= and ?offset=; both are clamped."""

    def _int(self, request, name, default, minimum):
        try:
            value = int(request.query_params.get(name, default))
        except (TypeError, ValueError):
            return default
        return max(minimum, value)

    def paginate_queryset(self, queryset, request, view=None):
        cap = int(getattr(settings, 'MAX_LIST_RESULTS', 1000))
        limit = min(self._int(request, 'limit', cap, 1), cap)
        offset = self._int(request, 'offset', 0, 0)
        return list(queryset[offset:offset + limit])

    def get_paginated_response(self, data):
        return Response(data)

    def get_paginated_response_schema(self, schema):
        return schema
