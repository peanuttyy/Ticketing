import json

import azure.functions as func

from shared.categories import CATEGORIES


def main(req: func.HttpRequest) -> func.HttpResponse:
    categories = list(
        CATEGORIES.keys()
    )


    return func.HttpResponse(
        json.dumps({
            "categories": categories
        }),
        status_code=200,
        mimetype="application/json"
    )