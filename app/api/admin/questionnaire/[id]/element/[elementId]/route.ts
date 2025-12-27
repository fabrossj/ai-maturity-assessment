import { NextResponse } from 'next/server';
import { updateElement } from '@/lib/services/questionnaire';
import { z } from 'zod';

const updateElementSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
  order: z.number().int().min(0).optional()
});

/**
 * PATCH /api/admin/questionnaire/:id/element/:elementId
 * Update element details (only for DRAFT versions)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; elementId: string } }
) {
  try {
    const body = await req.json();
    const data = updateElementSchema.parse(body);

    const updatedElement = await updateElement(params.id, params.elementId, data);
    return NextResponse.json(updatedElement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating element:', error);
    const message = error instanceof Error ? error.message : 'Failed to update element';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
