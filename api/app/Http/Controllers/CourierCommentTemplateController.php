<?php

namespace App\Http\Controllers;

use App\Models\CourierCommentTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourierCommentTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'templates' => CourierCommentTemplate::query()
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        $template = CourierCommentTemplate::query()->create($validated);

        return response()->json([
            'message' => 'Courier comment template created successfully.',
            'template' => $template,
        ], 201);
    }

    public function update(Request $request, CourierCommentTemplate $courierCommentTemplate): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        $courierCommentTemplate->update($validated);

        return response()->json([
            'message' => 'Courier comment template updated successfully.',
            'template' => $courierCommentTemplate->fresh(),
        ]);
    }

    public function destroy(CourierCommentTemplate $courierCommentTemplate): JsonResponse
    {
        $courierCommentTemplate->delete();

        return response()->json([
            'message' => 'Courier comment template deleted successfully.',
        ]);
    }
}
