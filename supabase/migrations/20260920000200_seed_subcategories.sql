-- Seed standard subcategories for key Hosur marketplace categories

with cat as (
  select id, slug from public.categories
)
insert into public.subcategories (category_id, name, slug, description, active)
select cat.id, sub.name, sub.slug, sub.description, true
from (
  values
    -- Services
    ('services', 'Plumbing', 'plumbing', 'Plumbing installation, leak repairs, and pipe fittings'),
    ('services', 'Electrical & Wiring', 'electrical-wiring', 'Electrical repairs, wiring installations, and maintenance'),
    ('services', 'Cleaning & Housekeeping', 'cleaning-housekeeping', 'Home and commercial deep cleaning and sanitization services'),
    ('services', 'AC Repair & HVAC', 'ac-repair-hvac', 'Air conditioning servicing, gas charging, and HVAC solutions'),
    ('services', 'Painting & Waterproofing', 'painting-waterproofing', 'Interior and exterior painting, weather-proofing, and coating'),
    ('services', 'Carpentry & Woodwork', 'carpentry-woodwork', 'Custom furniture, door repairs, and interior woodwork'),

    -- Products
    ('products', 'Hardware & Fasteners', 'hardware-fasteners', 'Nuts, bolts, screws, anchors, and industrial hardware'),
    ('products', 'Electrical & Electronics', 'electrical-electronics', 'Cables, switchgear, LED lighting, and components'),
    ('products', 'Industrial Tools', 'industrial-tools', 'Hand tools, power tools, cutting tools, and abrasives'),
    ('products', 'Safety & PPE', 'safety-ppe', 'Helmets, safety shoes, gloves, masks, and protective gear'),
    ('products', 'Raw Materials & Metals', 'raw-materials-metals', 'Steel, aluminium, polymers, and manufacturing raw materials'),

    -- Industry
    ('industry', 'CNC Machining', 'cnc-machining', 'Precision CNC milling, turning, and multi-axis machining'),
    ('industry', 'Sheet Metal & Fabrication', 'sheet-metal-fabrication', 'Laser cutting, bending, welding, and metal enclosures'),
    ('industry', 'Tool & Die Making', 'tool-die-making', 'Press tools, plastic moulds, and precision dies'),
    ('industry', 'Auto Components', 'auto-components', 'Automotive OEM and aftermarket parts manufacturing'),
    ('industry', 'Surface Treatment & Coating', 'surface-treatment-coating', 'Powder coating, anodizing, electroplating, and heat treatment'),

    -- Property
    ('property', 'Commercial Office', 'commercial-office', 'Office spaces, tech parks, and commercial suites in Hosur'),
    ('property', 'Industrial Shed & Plot', 'industrial-shed-plot', 'SIPCOT industrial sheds, manufacturing plants, and factory plots'),
    ('property', 'Residential Apartment / Villa', 'residential-apartment-villa', 'Flats, gated community villas, and independent houses'),
    ('property', 'Warehouse & Godown', 'warehouse-godown', 'Storage warehouses, logistics hubs, and distribution centers'),

    -- Logistics
    ('logistics', 'Freight & Cargo Transport', 'freight-cargo-transport', 'Intercity and intrastate truckload and container freight'),
    ('logistics', 'Courier & Express Parcel', 'courier-express-parcel', 'Fast local and domestic parcel delivery services'),
    ('logistics', 'Fleet & Commercial Vehicle Rental', 'fleet-commercial-vehicle-rental', 'Tempo, pickup truck, and container rental services'),

    -- Equipment
    ('equipment', 'Heavy Earthmoving Machinery', 'heavy-earthmoving-machinery', 'JCBs, excavators, bulldozers, and site clearance equipment'),
    ('equipment', 'Industrial Power & DG Sets', 'industrial-power-dg-sets', 'Diesel generators, UPS systems, and power rental solutions'),
    ('equipment', 'Material Handling Equipment', 'material-handling-equipment', 'Forklifts, pallet trucks, cranes, and hoists'),

    -- Professionals
    ('professionals', 'Legal & Tax Consultants', 'legal-tax-consultants', 'Chartered accountants, GST filing, and company legal advisors'),
    ('professionals', 'Architects & Civil Engineers', 'architects-civil-engineers', 'Building planning, structural drawing, and 3D elevations'),
    ('professionals', 'IT & Digital Solutions', 'it-digital-solutions', 'Custom software, web development, and digital marketing')
) as sub(cat_slug, name, slug, description)
join cat on cat.slug = sub.cat_slug
on conflict (category_id, slug) do update
set name = excluded.name,
    description = excluded.description,
    active = true;
