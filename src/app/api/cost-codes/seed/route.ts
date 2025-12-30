import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// CSI MasterFormat Divisions (2020 Edition - Core divisions used in construction)
const CSI_DIVISIONS = [
  { division: '00', name: 'Procurement and Contracting Requirements' },
  { division: '01', name: 'General Requirements' },
  { division: '02', name: 'Existing Conditions' },
  { division: '03', name: 'Concrete' },
  { division: '04', name: 'Masonry' },
  { division: '05', name: 'Metals' },
  { division: '06', name: 'Wood, Plastics, and Composites' },
  { division: '07', name: 'Thermal and Moisture Protection' },
  { division: '08', name: 'Openings' },
  { division: '09', name: 'Finishes' },
  { division: '10', name: 'Specialties' },
  { division: '11', name: 'Equipment' },
  { division: '12', name: 'Furnishings' },
  { division: '13', name: 'Special Construction' },
  { division: '14', name: 'Conveying Equipment' },
  { division: '21', name: 'Fire Suppression' },
  { division: '22', name: 'Plumbing' },
  { division: '23', name: 'HVAC' },
  { division: '25', name: 'Integrated Automation' },
  { division: '26', name: 'Electrical' },
  { division: '27', name: 'Communications' },
  { division: '28', name: 'Electronic Safety and Security' },
  { division: '31', name: 'Earthwork' },
  { division: '32', name: 'Exterior Improvements' },
  { division: '33', name: 'Utilities' },
];

// Common cost code sections within divisions
const CSI_SECTIONS: { division: string; code: string; name: string }[] = [
  // Division 01 - General Requirements
  { division: '01', code: '01 10 00', name: 'Summary' },
  { division: '01', code: '01 20 00', name: 'Price and Payment Procedures' },
  { division: '01', code: '01 30 00', name: 'Administrative Requirements' },
  { division: '01', code: '01 40 00', name: 'Quality Requirements' },
  { division: '01', code: '01 50 00', name: 'Temporary Facilities and Controls' },
  { division: '01', code: '01 60 00', name: 'Product Requirements' },
  { division: '01', code: '01 70 00', name: 'Execution and Closeout Requirements' },
  { division: '01', code: '01 80 00', name: 'Performance Requirements' },

  // Division 02 - Existing Conditions
  { division: '02', code: '02 21 00', name: 'Surveys' },
  { division: '02', code: '02 41 00', name: 'Demolition' },
  { division: '02', code: '02 42 00', name: 'Removal and Salvage' },

  // Division 03 - Concrete
  { division: '03', code: '03 10 00', name: 'Concrete Forming and Accessories' },
  { division: '03', code: '03 20 00', name: 'Concrete Reinforcing' },
  { division: '03', code: '03 30 00', name: 'Cast-in-Place Concrete' },
  { division: '03', code: '03 35 00', name: 'Concrete Finishing' },
  { division: '03', code: '03 40 00', name: 'Precast Concrete' },
  { division: '03', code: '03 50 00', name: 'Cast Decks and Underlayment' },

  // Division 04 - Masonry
  { division: '04', code: '04 20 00', name: 'Unit Masonry' },
  { division: '04', code: '04 22 00', name: 'Concrete Unit Masonry' },
  { division: '04', code: '04 40 00', name: 'Stone Assemblies' },
  { division: '04', code: '04 70 00', name: 'Manufactured Masonry' },

  // Division 05 - Metals
  { division: '05', code: '05 10 00', name: 'Structural Metal Framing' },
  { division: '05', code: '05 12 00', name: 'Structural Steel Framing' },
  { division: '05', code: '05 21 00', name: 'Steel Joist Framing' },
  { division: '05', code: '05 31 00', name: 'Steel Decking' },
  { division: '05', code: '05 40 00', name: 'Cold-Formed Metal Framing' },
  { division: '05', code: '05 50 00', name: 'Metal Fabrications' },
  { division: '05', code: '05 51 00', name: 'Metal Stairs' },
  { division: '05', code: '05 52 00', name: 'Metal Railings' },

  // Division 06 - Wood, Plastics, and Composites
  { division: '06', code: '06 10 00', name: 'Rough Carpentry' },
  { division: '06', code: '06 11 00', name: 'Wood Framing' },
  { division: '06', code: '06 16 00', name: 'Sheathing' },
  { division: '06', code: '06 20 00', name: 'Finish Carpentry' },
  { division: '06', code: '06 22 00', name: 'Millwork' },
  { division: '06', code: '06 40 00', name: 'Architectural Woodwork' },
  { division: '06', code: '06 41 00', name: 'Architectural Wood Casework' },

  // Division 07 - Thermal and Moisture Protection
  { division: '07', code: '07 10 00', name: 'Dampproofing and Waterproofing' },
  { division: '07', code: '07 20 00', name: 'Thermal Protection' },
  { division: '07', code: '07 21 00', name: 'Thermal Insulation' },
  { division: '07', code: '07 30 00', name: 'Steep Slope Roofing' },
  { division: '07', code: '07 31 00', name: 'Shingles and Shakes' },
  { division: '07', code: '07 50 00', name: 'Membrane Roofing' },
  { division: '07', code: '07 60 00', name: 'Flashing and Sheet Metal' },
  { division: '07', code: '07 90 00', name: 'Joint Protection' },
  { division: '07', code: '07 92 00', name: 'Joint Sealants' },

  // Division 08 - Openings
  { division: '08', code: '08 10 00', name: 'Doors and Frames' },
  { division: '08', code: '08 11 00', name: 'Metal Doors and Frames' },
  { division: '08', code: '08 14 00', name: 'Wood Doors' },
  { division: '08', code: '08 30 00', name: 'Specialty Doors and Frames' },
  { division: '08', code: '08 33 00', name: 'Coiling Doors and Grilles' },
  { division: '08', code: '08 36 00', name: 'Panel Doors' },
  { division: '08', code: '08 50 00', name: 'Windows' },
  { division: '08', code: '08 51 00', name: 'Metal Windows' },
  { division: '08', code: '08 54 00', name: 'Composite Windows' },
  { division: '08', code: '08 71 00', name: 'Door Hardware' },
  { division: '08', code: '08 80 00', name: 'Glazing' },

  // Division 09 - Finishes
  { division: '09', code: '09 20 00', name: 'Plaster and Gypsum Board' },
  { division: '09', code: '09 21 00', name: 'Plaster and Gypsum Board Assemblies' },
  { division: '09', code: '09 22 00', name: 'Supports for Plaster and Gypsum Board' },
  { division: '09', code: '09 29 00', name: 'Gypsum Board' },
  { division: '09', code: '09 30 00', name: 'Tiling' },
  { division: '09', code: '09 50 00', name: 'Ceilings' },
  { division: '09', code: '09 51 00', name: 'Acoustical Ceilings' },
  { division: '09', code: '09 60 00', name: 'Flooring' },
  { division: '09', code: '09 64 00', name: 'Wood Flooring' },
  { division: '09', code: '09 65 00', name: 'Resilient Flooring' },
  { division: '09', code: '09 68 00', name: 'Carpeting' },
  { division: '09', code: '09 90 00', name: 'Painting and Coating' },
  { division: '09', code: '09 91 00', name: 'Painting' },

  // Division 10 - Specialties
  { division: '10', code: '10 10 00', name: 'Information Specialties' },
  { division: '10', code: '10 14 00', name: 'Signage' },
  { division: '10', code: '10 21 00', name: 'Compartments and Cubicles' },
  { division: '10', code: '10 28 00', name: 'Toilet, Bath, and Laundry Accessories' },
  { division: '10', code: '10 44 00', name: 'Fire Protection Specialties' },

  // Division 11 - Equipment
  { division: '11', code: '11 30 00', name: 'Residential Equipment' },
  { division: '11', code: '11 31 00', name: 'Residential Appliances' },
  { division: '11', code: '11 40 00', name: 'Foodservice Equipment' },

  // Division 12 - Furnishings
  { division: '12', code: '12 20 00', name: 'Window Treatments' },
  { division: '12', code: '12 30 00', name: 'Casework' },
  { division: '12', code: '12 35 00', name: 'Specialty Casework' },
  { division: '12', code: '12 36 00', name: 'Countertops' },

  // Division 21 - Fire Suppression
  { division: '21', code: '21 10 00', name: 'Water-Based Fire-Suppression Systems' },
  { division: '21', code: '21 13 00', name: 'Fire-Suppression Sprinkler Systems' },

  // Division 22 - Plumbing
  { division: '22', code: '22 05 00', name: 'Common Work Results for Plumbing' },
  { division: '22', code: '22 10 00', name: 'Plumbing Piping and Pumps' },
  { division: '22', code: '22 11 00', name: 'Facility Water Distribution' },
  { division: '22', code: '22 13 00', name: 'Facility Sanitary Sewerage' },
  { division: '22', code: '22 30 00', name: 'Plumbing Equipment' },
  { division: '22', code: '22 40 00', name: 'Plumbing Fixtures' },
  { division: '22', code: '22 42 00', name: 'Commercial Plumbing Fixtures' },

  // Division 23 - HVAC
  { division: '23', code: '23 05 00', name: 'Common Work Results for HVAC' },
  { division: '23', code: '23 07 00', name: 'HVAC Insulation' },
  { division: '23', code: '23 09 00', name: 'Instrumentation and Control for HVAC' },
  { division: '23', code: '23 20 00', name: 'HVAC Piping and Pumps' },
  { division: '23', code: '23 30 00', name: 'HVAC Air Distribution' },
  { division: '23', code: '23 31 00', name: 'HVAC Ducts and Casings' },
  { division: '23', code: '23 34 00', name: 'HVAC Fans' },
  { division: '23', code: '23 50 00', name: 'Central Heating Equipment' },
  { division: '23', code: '23 60 00', name: 'Central Cooling Equipment' },
  { division: '23', code: '23 80 00', name: 'Decentralized HVAC Equipment' },

  // Division 26 - Electrical
  { division: '26', code: '26 05 00', name: 'Common Work Results for Electrical' },
  { division: '26', code: '26 09 00', name: 'Instrumentation and Control for Electrical' },
  { division: '26', code: '26 20 00', name: 'Low-Voltage Electrical Transmission' },
  { division: '26', code: '26 22 00', name: 'Low-Voltage Transformers' },
  { division: '26', code: '26 24 00', name: 'Switchboards and Panelboards' },
  { division: '26', code: '26 27 00', name: 'Low-Voltage Distribution Equipment' },
  { division: '26', code: '26 28 00', name: 'Low-Voltage Circuit Protective Devices' },
  { division: '26', code: '26 29 00', name: 'Low-Voltage Controllers' },
  { division: '26', code: '26 50 00', name: 'Lighting' },
  { division: '26', code: '26 51 00', name: 'Interior Lighting' },
  { division: '26', code: '26 56 00', name: 'Exterior Lighting' },

  // Division 27 - Communications
  { division: '27', code: '27 10 00', name: 'Structured Cabling' },
  { division: '27', code: '27 11 00', name: 'Communications Equipment Room Fittings' },
  { division: '27', code: '27 15 00', name: 'Communications Horizontal Cabling' },

  // Division 28 - Electronic Safety and Security
  { division: '28', code: '28 10 00', name: 'Electronic Access Control and Intrusion Detection' },
  { division: '28', code: '28 30 00', name: 'Electronic Detection and Alarm' },
  { division: '28', code: '28 31 00', name: 'Fire Detection and Alarm' },

  // Division 31 - Earthwork
  { division: '31', code: '31 10 00', name: 'Site Clearing' },
  { division: '31', code: '31 20 00', name: 'Earth Moving' },
  { division: '31', code: '31 22 00', name: 'Grading' },
  { division: '31', code: '31 23 00', name: 'Excavation and Fill' },
  { division: '31', code: '31 25 00', name: 'Erosion and Sedimentation Controls' },
  { division: '31', code: '31 60 00', name: 'Special Foundations and Load-Bearing Elements' },

  // Division 32 - Exterior Improvements
  { division: '32', code: '32 10 00', name: 'Bases, Ballasts, and Paving' },
  { division: '32', code: '32 12 00', name: 'Flexible Paving' },
  { division: '32', code: '32 13 00', name: 'Rigid Paving' },
  { division: '32', code: '32 14 00', name: 'Unit Paving' },
  { division: '32', code: '32 16 00', name: 'Curbs and Gutters' },
  { division: '32', code: '32 17 00', name: 'Paving Specialties' },
  { division: '32', code: '32 30 00', name: 'Site Improvements' },
  { division: '32', code: '32 31 00', name: 'Fences and Gates' },
  { division: '32', code: '32 32 00', name: 'Retaining Walls' },
  { division: '32', code: '32 80 00', name: 'Irrigation' },
  { division: '32', code: '32 90 00', name: 'Planting' },
  { division: '32', code: '32 93 00', name: 'Plants' },

  // Division 33 - Utilities
  { division: '33', code: '33 10 00', name: 'Water Utilities' },
  { division: '33', code: '33 30 00', name: 'Sanitary Sewerage' },
  { division: '33', code: '33 40 00', name: 'Storm Drainage' },
  { division: '33', code: '33 70 00', name: 'Electrical Utilities' },
  { division: '33', code: '33 71 00', name: 'Electrical Utility Transmission and Distribution' },
];

// POST - Seed default CSI cost codes
export async function POST(request: NextRequest) {
  try {
    const client = getTurso();

    // Check if codes already exist
    const existingCodes = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM cost_codes WHERE is_default = 1',
      args: [],
    });

    const count = Number((existingCodes.rows[0] as any)?.count || 0);

    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: `Default cost codes already exist (${count} codes). Skipping seed.`,
        seeded: false,
        count,
      });
    }

    // Insert divisions (Level 1)
    for (const div of CSI_DIVISIONS) {
      const id = generateId();
      await client.execute({
        sql: `
          INSERT INTO cost_codes (id, code, division, name, level, is_default)
          VALUES (?, ?, ?, ?, 1, 1)
        `,
        args: [id, `${div.division} 00 00`, div.division, div.name],
      });
    }

    // Insert sections (Level 2)
    for (const section of CSI_SECTIONS) {
      const id = generateId();
      await client.execute({
        sql: `
          INSERT INTO cost_codes (id, code, division, name, parent_code, level, is_default)
          VALUES (?, ?, ?, ?, ?, 2, 1)
        `,
        args: [id, section.code, section.division, section.name, `${section.division} 00 00`],
      });
    }

    const totalInserted = CSI_DIVISIONS.length + CSI_SECTIONS.length;

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${totalInserted} cost codes`,
      seeded: true,
      count: totalInserted,
      divisions: CSI_DIVISIONS.length,
      sections: CSI_SECTIONS.length,
    });
  } catch (error: any) {
    console.error('Error seeding cost codes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
