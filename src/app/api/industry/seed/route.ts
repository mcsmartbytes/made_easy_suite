import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// Industry-specific phases with their tasks
const industryPhases: Record<string, { name: string; order: number; tasks: string[] }[]> = {
  roofing: [
    { name: 'Tear-Off', order: 1, tasks: ['Remove old shingles', 'Inspect decking', 'Dispose debris', 'Install ice guard'] },
    { name: 'Sheathing', order: 2, tasks: ['Replace damaged decking', 'Install drip edge', 'Install underlayment'] },
    { name: 'Installation', order: 3, tasks: ['Install starter shingles', 'Install field shingles', 'Install ridge cap', 'Install flashing'] },
    { name: 'Cleanup', order: 4, tasks: ['Magnetic sweep', 'Final inspection', 'Customer walkthrough'] },
  ],
  framing: [
    { name: 'Layout', order: 1, tasks: ['Mark plate lines', 'Transfer elevations', 'Set foundation bolts'] },
    { name: 'Wall Framing', order: 2, tasks: ['Build headers', 'Frame walls', 'Stand walls', 'Brace walls'] },
    { name: 'Roof Framing', order: 3, tasks: ['Set ridge board', 'Cut rafters', 'Install rafters', 'Sheath roof'] },
    { name: 'Sheathing', order: 4, tasks: ['Install wall sheathing', 'Install corner bracing', 'Window/door openings'] },
  ],
  electrical: [
    { name: 'Rough-In', order: 1, tasks: ['Pull permits', 'Run main feed', 'Install boxes', 'Pull wire'] },
    { name: 'Trim', order: 2, tasks: ['Install outlets', 'Install switches', 'Install fixtures', 'Connect panel'] },
    { name: 'Final', order: 3, tasks: ['Test circuits', 'Label panel', 'Final inspection', 'Customer demo'] },
  ],
  plumbing: [
    { name: 'Ground Rough', order: 1, tasks: ['Install main drain', 'Install underground', 'Set tub/shower pans'] },
    { name: 'Top-Out', order: 2, tasks: ['Run supply lines', 'Install vents', 'Test pressure', 'Inspection'] },
    { name: 'Trim', order: 3, tasks: ['Install fixtures', 'Connect appliances', 'Test flow', 'Final inspection'] },
  ],
  hvac: [
    { name: 'Rough-In', order: 1, tasks: ['Install ductwork', 'Set equipment pad', 'Run refrigerant lines'] },
    { name: 'Equipment', order: 2, tasks: ['Set condenser', 'Set air handler', 'Connect lineset', 'Wire controls'] },
    { name: 'Finish', order: 3, tasks: ['Install registers', 'Startup system', 'Test/balance', 'Customer training'] },
  ],
  painting: [
    { name: 'Prep', order: 1, tasks: ['Protect surfaces', 'Patch holes', 'Sand surfaces', 'Caulk gaps'] },
    { name: 'Prime', order: 2, tasks: ['Prime walls', 'Prime trim', 'Spot prime repairs'] },
    { name: 'Paint', order: 3, tasks: ['Paint ceilings', 'Paint walls', 'Paint trim', 'Paint doors'] },
    { name: 'Touch-up', order: 4, tasks: ['Final touchups', 'Remove protection', 'Clean up'] },
  ],
  concrete: [
    { name: 'Prep', order: 1, tasks: ['Excavate', 'Compact soil', 'Set forms', 'Install rebar'] },
    { name: 'Pour', order: 2, tasks: ['Order concrete', 'Pour slab', 'Screed', 'Float finish'] },
    { name: 'Finish', order: 3, tasks: ['Trowel', 'Apply sealer', 'Cut control joints', 'Strip forms'] },
  ],
  landscaping: [
    { name: 'Site Prep', order: 1, tasks: ['Clear debris', 'Grade land', 'Install drainage', 'Amend soil'] },
    { name: 'Hardscape', order: 2, tasks: ['Install edging', 'Lay pavers', 'Build walls', 'Install lighting'] },
    { name: 'Softscape', order: 3, tasks: ['Plant trees', 'Plant shrubs', 'Install sod', 'Apply mulch'] },
    { name: 'Irrigation', order: 4, tasks: ['Run mainline', 'Install zones', 'Set heads', 'Program timer'] },
  ],
  flooring: [
    { name: 'Prep', order: 1, tasks: ['Remove old floor', 'Level subfloor', 'Install underlayment', 'Acclimate materials'] },
    { name: 'Install', order: 2, tasks: ['Lay flooring', 'Make cuts', 'Install transitions', 'Install trim'] },
    { name: 'Finish', order: 3, tasks: ['Clean surface', 'Apply finish', 'Install shoe mold', 'Final walkthrough'] },
  ],
  general: [
    { name: 'Pre-Construction', order: 1, tasks: ['Permits', 'Site prep', 'Order materials', 'Schedule subs'] },
    { name: 'Foundation', order: 2, tasks: ['Excavation', 'Footings', 'Foundation walls', 'Backfill'] },
    { name: 'Framing', order: 3, tasks: ['Floor system', 'Wall framing', 'Roof framing', 'Sheathing'] },
    { name: 'MEP Rough', order: 4, tasks: ['Electrical rough', 'Plumbing rough', 'HVAC rough', 'Inspections'] },
    { name: 'Drywall', order: 5, tasks: ['Hang drywall', 'Tape/mud', 'Texture', 'Prime'] },
    { name: 'Finish', order: 6, tasks: ['Paint', 'Trim', 'Flooring', 'Fixtures'] },
    { name: 'Final', order: 7, tasks: ['Punch list', 'Final inspections', 'Clean', 'Closeout'] },
  ],
};

// Industry-specific custom fields
const industryFields: Record<string, { name: string; label: string; type: string; options?: string }[]> = {
  roofing: [
    { name: 'roof_type', label: 'Roof Type', type: 'select', options: 'Shingle,Metal,Tile,Flat,Slate' },
    { name: 'roof_pitch', label: 'Roof Pitch', type: 'text' },
    { name: 'square_footage', label: 'Square Footage', type: 'number' },
    { name: 'layers_to_remove', label: 'Layers to Remove', type: 'number' },
  ],
  framing: [
    { name: 'lumber_type', label: 'Lumber Type', type: 'select', options: 'SPF,Doug Fir,LVL,TJI' },
    { name: 'wall_height', label: 'Wall Height', type: 'text' },
    { name: 'truss_or_stick', label: 'Truss/Stick', type: 'select', options: 'Truss,Stick-Built' },
  ],
  electrical: [
    { name: 'panel_size', label: 'Panel Size (Amps)', type: 'select', options: '100,150,200,400' },
    { name: 'circuits_count', label: 'Circuit Count', type: 'number' },
    { name: 'permit_number', label: 'Permit Number', type: 'text' },
  ],
  plumbing: [
    { name: 'fixtures_count', label: 'Fixture Count', type: 'number' },
    { name: 'water_heater_type', label: 'Water Heater', type: 'select', options: 'Tank,Tankless,Heat Pump' },
    { name: 'pipe_material', label: 'Pipe Material', type: 'select', options: 'PEX,Copper,CPVC,PVC' },
  ],
  hvac: [
    { name: 'system_type', label: 'System Type', type: 'select', options: 'Split,Package,Mini-Split,Geothermal' },
    { name: 'tonnage', label: 'Tonnage', type: 'number' },
    { name: 'seer_rating', label: 'SEER Rating', type: 'number' },
    { name: 'duct_type', label: 'Duct Type', type: 'select', options: 'Flex,Metal,Ductless' },
  ],
  painting: [
    { name: 'paint_brand', label: 'Paint Brand', type: 'text' },
    { name: 'coats_required', label: 'Coats Required', type: 'number' },
    { name: 'surface_type', label: 'Surface Type', type: 'select', options: 'Drywall,Wood,Stucco,Brick' },
  ],
  concrete: [
    { name: 'psi_strength', label: 'PSI Strength', type: 'select', options: '2500,3000,3500,4000,4500' },
    { name: 'slab_thickness', label: 'Slab Thickness (in)', type: 'number' },
    { name: 'finish_type', label: 'Finish Type', type: 'select', options: 'Broom,Smooth,Exposed,Stamped' },
  ],
  landscaping: [
    { name: 'lot_size', label: 'Lot Size (sqft)', type: 'number' },
    { name: 'irrigation_type', label: 'Irrigation', type: 'select', options: 'Drip,Spray,Rotor,None' },
    { name: 'hardscape_material', label: 'Hardscape Material', type: 'select', options: 'Pavers,Concrete,Stone,Gravel' },
  ],
  flooring: [
    { name: 'floor_type', label: 'Floor Type', type: 'select', options: 'Hardwood,Laminate,LVP,Tile,Carpet' },
    { name: 'square_footage', label: 'Square Footage', type: 'number' },
    { name: 'subfloor_type', label: 'Subfloor', type: 'select', options: 'Plywood,OSB,Concrete' },
  ],
  general: [
    { name: 'project_type', label: 'Project Type', type: 'select', options: 'New Build,Remodel,Addition,Repair' },
    { name: 'building_type', label: 'Building Type', type: 'select', options: 'Residential,Commercial,Industrial' },
    { name: 'square_footage', label: 'Square Footage', type: 'number' },
    { name: 'permit_number', label: 'Permit Number', type: 'text' },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, industry_id } = body;

    if (!user_id || !industry_id) {
      return NextResponse.json(
        { success: false, error: 'user_id and industry_id are required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Ensure tables exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_phases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phase_order INTEGER DEFAULT 0,
        tasks TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_fields (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        field_options TEXT,
        field_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Get the industry name
    const industryResult = await client.execute({
      sql: 'SELECT id, name FROM industries WHERE id = ?',
      args: [industry_id],
    });

    if (industryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Industry not found' },
        { status: 404 }
      );
    }

    // Extract slug from ID (e.g., 'ind_roofing' -> 'roofing') or use name
    const industryId = industryResult.rows[0].id as string;
    const industryName = industryResult.rows[0].name as string;
    const industrySlug = industryId.replace('ind_', '') || industryName.toLowerCase().replace(/\s+/g, '_');
    const phases = industryPhases[industrySlug] || industryPhases.general;
    const fields = industryFields[industrySlug] || industryFields.general;

    // Delete existing user phases and fields
    await client.execute({
      sql: 'DELETE FROM user_phases WHERE user_id = ?',
      args: [user_id],
    });
    await client.execute({
      sql: 'DELETE FROM user_fields WHERE user_id = ?',
      args: [user_id],
    });

    // Insert phases and tasks
    const phasesCreated = [];
    for (const phase of phases) {
      const phaseId = generateId();
      await client.execute({
        sql: `INSERT INTO user_phases (id, user_id, name, phase_order, tasks)
              VALUES (?, ?, ?, ?, ?)`,
        args: [phaseId, user_id, phase.name, phase.order, JSON.stringify(phase.tasks)],
      });
      phasesCreated.push({ id: phaseId, name: phase.name, tasks: phase.tasks });
    }

    // Insert custom fields
    const fieldsCreated = [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldId = generateId();
      await client.execute({
        sql: `INSERT INTO user_fields (id, user_id, field_name, field_label, field_type, field_options, field_order)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [fieldId, user_id, field.name, field.label, field.type, field.options || null, i + 1],
      });
      fieldsCreated.push({ id: fieldId, name: field.name, label: field.label });
    }

    return NextResponse.json({
      success: true,
      data: {
        phases: phasesCreated,
        fields: fieldsCreated,
      },
      message: `Seeded ${phasesCreated.length} phases and ${fieldsCreated.length} custom fields for ${industrySlug}`,
    });
  } catch (error: any) {
    console.error('Error seeding industry data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
