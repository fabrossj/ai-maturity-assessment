import { NextResponse } from 'next/server';
import { updateArea } from '@/lib/services/questionnaire';
import { z } from 'zod';

const updateAreaSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
  order: z.number().int().min(0).optional()
});

/**
 * PATCH /api/admin/questionnaire/:id/area/:areaId
 * Update area details (only for DRAFT versions)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; areaId: string } }
) {
  try {
    const body = await req.json();
    const data = updateAreaSchema.parse(body);

    const updatedArea = await updateArea(params.id, params.areaId, data);
    return NextResponse.json(updatedArea);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating area:', error);
    const message = error instanceof Error ? error.message : 'Failed to update area';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
