/* eslint-disable no-console */
// Seed AssetFlow with realistic demo data across every module.
// Run: npm run seed   (wipes existing data first)

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function at(dateOffsetDays, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dateOffsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function reset() {
  // Delete in FK-safe order.
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.auditItem.deleteMany(),
    prisma.auditAssignment.deleteMany(),
    prisma.auditCycle.deleteMany(),
    prisma.maintenanceRequest.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.transferRequest.deleteMany(),
    prisma.allocation.deleteMany(),
    prisma.assetDocument.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.assetCategory.deleteMany(),
    prisma.counter.deleteMany(),
  ]);
  // Detach department heads/parents before deleting users & departments.
  await prisma.department.updateMany({ data: { headId: null, parentDepartmentId: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}

async function main() {
  console.log('🌱 Seeding AssetFlow…');
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ─── Departments ─────────────────────────────────────────────
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const facilities = await prisma.department.create({ data: { name: 'Facilities' } });
  const fieldOps = await prisma.department.create({ data: { name: 'Field Ops' } });
  const it = await prisma.department.create({
    data: { name: 'IT', parentDepartmentId: engineering.id },
  });

  // ─── Users (one per role + extras) ──────────────────────────
  const mk = (name, email, role, departmentId) =>
    prisma.user.create({ data: { name, email, passwordHash, role, departmentId } });

  const admin = await mk('Avery Admin', 'admin@assetflow.dev', 'ADMIN', it.id);
  const manager = await mk('Morgan Manager', 'manager@assetflow.dev', 'ASSET_MANAGER', facilities.id);
  const head = await mk('Devi Head', 'head@assetflow.dev', 'DEPARTMENT_HEAD', engineering.id);
  const priya = await mk('Priya Shah', 'priya@assetflow.dev', 'EMPLOYEE', engineering.id);
  const raj = await mk('Raj Verma', 'raj@assetflow.dev', 'EMPLOYEE', engineering.id);
  const arjun = await mk('Arjun Nair', 'arjun@assetflow.dev', 'EMPLOYEE', fieldOps.id);
  const sana = await mk('Sana Iqbal', 'sana@assetflow.dev', 'EMPLOYEE', facilities.id);

  // Assign department heads.
  await prisma.department.update({ where: { id: engineering.id }, data: { headId: head.id } });
  await prisma.department.update({ where: { id: facilities.id }, data: { headId: manager.id } });
  await prisma.department.update({ where: { id: fieldOps.id }, data: { headId: sana.id } });

  // ─── Categories ─────────────────────────────────────────────
  const electronics = await prisma.assetCategory.create({
    data: {
      name: 'Electronics',
      description: 'Laptops, monitors, projectors',
      customFields: [{ key: 'warrantyMonths', label: 'Warranty (months)', type: 'number', required: false }],
    },
  });
  const furniture = await prisma.assetCategory.create({
    data: { name: 'Furniture', description: 'Desks, chairs', customFields: [] },
  });
  const vehicles = await prisma.assetCategory.create({
    data: {
      name: 'Vehicles',
      description: 'Company vehicles',
      customFields: [{ key: 'plate', label: 'License Plate', type: 'text', required: true }],
    },
  });
  const spaces = await prisma.assetCategory.create({
    data: { name: 'Spaces', description: 'Bookable rooms & shared spaces', customFields: [] },
  });

  // ─── Assets (with auto AF-#### tags via a seeded counter) ───
  await prisma.counter.create({ data: { key: 'asset_tag', value: 0 } });
  let tagN = 0;
  const nextTag = () => `AF-${String(++tagN).padStart(4, '0')}`;

  async function createAsset(data) {
    const assetTag = nextTag();
    return prisma.asset.create({ data: { assetTag, qrCode: assetTag, ...data } });
  }

  const laptop1 = await createAsset({ name: 'Dell Latitude 5540', categoryId: electronics.id, serialNumber: 'DL-5540-001', condition: 'GOOD', location: 'HQ Floor 2', acquisitionDate: daysFromNow(-400), acquisitionCost: 1200, customFieldValues: { warrantyMonths: 24 } });
  const laptop2 = await createAsset({ name: 'MacBook Pro 16', categoryId: electronics.id, serialNumber: 'MBP-16-002', condition: 'NEW', location: 'HQ Floor 2', acquisitionDate: daysFromNow(-60), acquisitionCost: 2500, customFieldValues: { warrantyMonths: 12 } });
  const projector = await createAsset({ name: 'Epson Projector', categoryId: electronics.id, serialNumber: 'EP-900', condition: 'FAIR', location: 'HQ Floor 2', acquisitionDate: daysFromNow(-1600), acquisitionCost: 800, customFieldValues: { warrantyMonths: 24 } });
  const monitor = await createAsset({ name: 'LG UltraFine Monitor', categoryId: electronics.id, condition: 'GOOD', location: 'Warehouse', acquisitionDate: daysFromNow(-300), acquisitionCost: 600 });
  const chair = await createAsset({ name: 'Ergonomic Office Chair', categoryId: furniture.id, condition: 'GOOD', location: 'Warehouse', acquisitionDate: daysFromNow(-200), acquisitionCost: 350 });
  const desk = await createAsset({ name: 'Standing Desk', categoryId: furniture.id, condition: 'GOOD', location: 'HQ Floor 1', acquisitionDate: daysFromNow(-500), acquisitionCost: 500 });
  const van = await createAsset({ name: 'Ford Transit Van', categoryId: vehicles.id, condition: 'GOOD', location: 'Depot', acquisitionDate: daysFromNow(-800), acquisitionCost: 32000, customFieldValues: { plate: 'AF-1234' } });
  const roomB2 = await createAsset({ name: 'Conference Room B2', categoryId: spaces.id, condition: 'GOOD', location: 'HQ Floor 2', isBookable: true });
  const roomA1 = await createAsset({ name: 'Meeting Room A1', categoryId: spaces.id, condition: 'GOOD', location: 'HQ Floor 1', isBookable: true });
  await createAsset({ name: 'Camera Kit', categoryId: electronics.id, condition: 'GOOD', location: 'Media Store', isBookable: true, acquisitionDate: daysFromNow(-120), acquisitionCost: 1500 });

  // ─── Allocations (incl. one overdue) ────────────────────────
  async function allocate(asset, toUser, allocatedBy, expectedReturn, status = 'ACTIVE') {
    await prisma.allocation.create({
      data: {
        assetId: asset.id,
        toUserId: toUser.id,
        allocatedById: allocatedBy.id,
        expectedReturnDate: expectedReturn,
        status,
      },
    });
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'ALLOCATED', currentHolderId: toUser.id, currentDepartmentId: toUser.departmentId },
    });
  }
  await allocate(laptop1, priya, manager, daysFromNow(30));
  await allocate(van, arjun, manager, daysFromNow(-3), 'OVERDUE'); // overdue
  // A returned allocation in history for the monitor.
  await prisma.allocation.create({
    data: { assetId: monitor.id, toUserId: raj.id, allocatedById: manager.id, status: 'RETURNED', returnedAt: daysFromNow(-10), returnCondition: 'GOOD', allocatedAt: daysFromNow(-40) },
  });

  // ─── A pending transfer request for laptop1 ─────────────────
  await prisma.transferRequest.create({
    data: { assetId: laptop1.id, fromUserId: priya.id, toUserId: raj.id, requestedById: raj.id, reason: 'Priya moving teams', status: 'REQUESTED' },
  });

  // ─── Bookings for Room B2 (today) ───────────────────────────
  await prisma.booking.create({ data: { assetId: roomB2.id, bookedById: manager.id, startTime: at(0, 9), endTime: at(0, 10), purpose: 'Procurement sync', forDepartmentId: facilities.id } });
  await prisma.booking.create({ data: { assetId: roomB2.id, bookedById: head.id, startTime: at(0, 14), endTime: at(0, 15, 30), purpose: 'Sprint planning' } });
  await prisma.booking.create({ data: { assetId: roomA1.id, bookedById: priya.id, startTime: at(1, 11), endTime: at(1, 12), purpose: 'Design review' } });
  await prisma.booking.create({ data: { assetId: roomB2.id, bookedById: raj.id, startTime: at(-2, 10), endTime: at(-2, 11), status: 'COMPLETED', purpose: 'Retro' } });

  // ─── Maintenance (one at each stage) ────────────────────────
  await prisma.maintenanceRequest.create({ data: { assetId: projector.id, raisedById: priya.id, description: 'Bulb not turning on', priority: 'HIGH', status: 'PENDING' } });
  const mAppr = await prisma.maintenanceRequest.create({ data: { assetId: monitor.id, raisedById: raj.id, description: 'Dead pixels in corner', priority: 'MEDIUM', status: 'APPROVED', approvedById: manager.id } });
  await prisma.asset.update({ where: { id: monitor.id }, data: { status: 'UNDER_MAINTENANCE' } });
  await prisma.maintenanceRequest.create({ data: { assetId: desk.id, raisedById: sana.id, description: 'Wobbly leg', priority: 'LOW', status: 'IN_PROGRESS', approvedById: manager.id, technicianId: arjun.id } });
  await prisma.maintenanceRequest.create({ data: { assetId: chair.id, raisedById: sana.id, description: 'Torn armrest', priority: 'LOW', status: 'RESOLVED', approvedById: manager.id, technicianId: arjun.id, resolutionNotes: 'Replaced armrest', resolvedAt: daysFromNow(-1) } });

  // ─── An open audit cycle for Engineering ────────────────────
  const engAssets = await prisma.asset.findMany({ where: { currentDepartmentId: engineering.id, status: { notIn: ['DISPOSED', 'RETIRED'] } }, select: { id: true } });
  if (engAssets.length) {
    await prisma.auditCycle.create({
      data: {
        name: 'Q3 Audit — Engineering',
        scopeType: 'DEPARTMENT',
        scopeDepartmentId: engineering.id,
        startDate: daysFromNow(-2),
        endDate: daysFromNow(12),
        createdById: admin.id,
        assignments: { create: [{ auditorId: head.id }, { auditorId: sana.id }] },
        items: { create: engAssets.map((a) => ({ assetId: a.id })) },
      },
    });
  }

  // ─── A few notifications for the admin ──────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: 'OVERDUE_RETURN', title: 'Overdue return', message: 'AF-0007 — Ford Transit Van is past its expected return date.' },
      { userId: admin.id, type: 'MAINTENANCE_APPROVED', title: 'Maintenance approved', message: 'Monitor repair approved.' },
    ],
  });

  console.log('✅ Seed complete.\n');
  console.log('Demo accounts (password: %s):', DEMO_PASSWORD);
  console.log('  Admin           admin@assetflow.dev');
  console.log('  Asset Manager   manager@assetflow.dev');
  console.log('  Department Head  head@assetflow.dev');
  console.log('  Employee        priya@assetflow.dev / raj@assetflow.dev / arjun@assetflow.dev');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
