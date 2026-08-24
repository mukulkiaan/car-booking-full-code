import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { authMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware(['ADMIN']));

function driverRow(user) {
  const p = user.driverProfile;
  return {
    id: user.id,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    password: user.plainPassword || '',
    location: user.location || '',
    carType: p?.carType || '',
    vehicleNumber: p?.vehicleNumber || '',
    vehiclePhoto: p?.vehiclePhotoUrl || 'https://placehold.co/120x80?text=Vehicle',
    licensePhoto: p?.licensePhotoUrl || 'https://placehold.co/120x80?text=License',
    approvalStatus: p?.approvalStatus === 'APPROVED' ? 'Approved' : p?.approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending',
    status: p?.workStatus === 'BUSY' ? 'Busy' : 'Available',
  };
}

function customerRow(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    password: user.plainPassword || '',
    location: user.location || '',
    joined: user.createdAt.toLocaleDateString('en-GB'),
    totalRides: 0,
    spent: 0,
    status: user.deleted ? 'Suspended' : 'Active',
  };
}

router.get('/drivers', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users.map(driverRow));
});

router.post('/drivers', async (req, res) => {
  const { name, phone, location, vehicleName, vehicleNumber, password, vehiclePhotoUrl, licensePhotoUrl } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ message: 'Missing fields' });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      phone: String(phone),
      name,
      location: location || null,
      role: 'DRIVER',
      passwordHash,
      plainPassword: String(password),
      driverProfile: {
        create: {
          carType: vehicleName || 'Mini',
          vehicleNumber: vehicleNumber || 'NA',
          vehiclePhotoUrl: vehiclePhotoUrl || null,
          licensePhotoUrl: licensePhotoUrl || null,
          approvalStatus: 'PENDING',
        },
      },
    },
    include: { driverProfile: true },
  });

  const finalCarName = vehicleName || 'Mini';
  const existingCar = await prisma.carCategory.findFirst({ where: { name: finalCarName } });
  if (!existingCar) {
    await prisma.carCategory.create({
      data: {
        name: finalCarName,
        type: 'Standard',
        pricePerKm: 12,
        seats: 4,
        image: vehiclePhotoUrl || 'https://placehold.co/200x100?text=New+Car',
      }
    });
  }

  res.status(201).json(driverRow(user));
});

router.patch('/drivers/:userId', async (req, res) => {
  const { name, phone, location, vehicleName, vehicleNumber, password, vehiclePhotoUrl, licensePhotoUrl } = req.body;
  const userId = req.params.userId;
  const data = {};
  if (name) data.name = name;
  if (phone) data.phone = phone;
  if (location != null) data.location = location;
  if (password) {
    data.passwordHash = await bcrypt.hash(String(password), 10);
    data.plainPassword = String(password);
  }
  const pData = {};
  if (vehicleName) pData.carType = vehicleName;
  if (vehicleNumber) pData.vehicleNumber = vehicleNumber;
  if (vehiclePhotoUrl !== undefined) pData.vehiclePhotoUrl = vehiclePhotoUrl;
  if (licensePhotoUrl !== undefined) pData.licensePhotoUrl = licensePhotoUrl;

  const user = await prisma.user.update({
    where: { id: userId, role: 'DRIVER' },
    data: {
      ...data,
      ...(Object.keys(pData).length && {
        driverProfile: { update: pData },
      }),
    },
    include: { driverProfile: true },
  });

  if (vehicleName) {
    const existingCar = await prisma.carCategory.findFirst({ where: { name: vehicleName } });
    if (!existingCar) {
      await prisma.carCategory.create({
        data: {
          name: vehicleName,
          type: 'Standard',
          pricePerKm: 12,
          seats: 4,
          image: vehiclePhotoUrl || user.driverProfile?.vehiclePhotoUrl || 'https://placehold.co/200x100?text=New+Car',
        }
      });
    }
  }

  res.json(driverRow(user));
});

router.patch('/drivers/:userId/approval', async (req, res) => {
  const { status } = req.body;
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.userId, role: 'DRIVER' },
    data: { driverProfile: { update: { approvalStatus: status } } },
    include: { driverProfile: true },
  });
  res.json(driverRow(user));
});

router.delete('/drivers/:userId', async (req, res) => {
  const driverBookings = await prisma.booking.findMany({ where: { driverId: req.params.userId } });
  if (driverBookings.length > 0) {
    await prisma.booking.updateMany({ where: { driverId: req.params.userId }, data: { driverId: null } });
  }
  const dp = await prisma.driverProfile.findUnique({ where: { userId: req.params.userId } });
  if (dp) await prisma.driverProfile.delete({ where: { userId: req.params.userId } });
  await prisma.user.delete({ where: { id: req.params.userId, role: 'DRIVER' } });
  res.json({ ok: true });
});

router.get('/customers', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
  });
  const withStats = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.booking.aggregate({
        where: { customerId: u.id, status: 'COMPLETED' },
        _count: { id: true },
        _sum: { fare: true },
      });
      return {
        ...customerRow(u),
        totalRides: agg._count.id,
        spent: Math.round(agg._sum.fare || 0),
      };
    }),
  );
  res.json(withStats);
});

router.post('/customers', async (req, res) => {
  const { name, phone, location, password } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ message: 'Missing fields' });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      phone: String(phone),
      name,
      location: location || null,
      role: 'CUSTOMER',
      passwordHash,
      plainPassword: String(password),
    },
  });
  res.status(201).json(customerRow(user));
});

router.patch('/customers/:userId', async (req, res) => {
  const { name, phone, location, password } = req.body;
  const data = {};
  if (name) data.name = name;
  if (phone) data.phone = phone;
  if (location != null) data.location = location;
  if (password) {
    data.passwordHash = await bcrypt.hash(String(password), 10);
    data.plainPassword = String(password);
  }
  const user = await prisma.user.update({
    where: { id: req.params.userId, role: 'CUSTOMER' },
    data,
  });
  res.json(customerRow(user));
});

router.delete('/customers/:userId', async (req, res) => {
  const customerBookings = await prisma.booking.findMany({ where: { customerId: req.params.userId } });
  if (customerBookings.length > 0) {
    const bookingIds = customerBookings.map(b => b.id);
    await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.booking.deleteMany({ where: { customerId: req.params.userId } });
  }
  await prisma.user.delete({ where: { id: req.params.userId, role: 'CUSTOMER' } });
  res.json({ ok: true });
});

router.get('/cars', async (_req, res) => {
  const cars = await prisma.carCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(
    cars.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      pricePerKm: c.pricePerKm,
      seats: c.seats,
      image: c.image,
      eta: c.eta,
      availability: 'Live',
    })),
  );
});

router.post('/cars', async (req, res) => {
  const { name, type, pricePerKm, seats, image, eta } = req.body;
  if (!name || !type || !pricePerKm || !seats) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  const c = await prisma.carCategory.create({
    data: {
      name,
      type,
      pricePerKm: Number(pricePerKm),
      seats: Number(seats),
      image: image || 'https://placehold.co/200x100?text=New+Car',
      eta: eta || '5 mins',
    }
  });
  res.status(201).json({
    id: c.id, name: c.name, type: c.type, pricePerKm: c.pricePerKm, seats: c.seats, image: c.image, eta: c.eta, availability: 'Live'
  });
});

router.patch('/cars/:id', async (req, res) => {
  const { name, type, pricePerKm, seats, image, eta } = req.body;
  const data = {};
  if (name) data.name = name;
  if (type) data.type = type;
  if (pricePerKm) data.pricePerKm = Number(pricePerKm);
  if (seats) data.seats = Number(seats);
  if (image) data.image = image;
  if (eta) data.eta = eta;

  const c = await prisma.carCategory.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json({
    id: c.id,
    name: c.name,
    type: c.type,
    pricePerKm: c.pricePerKm,
    seats: c.seats,
    image: c.image,
    eta: c.eta,
    availability: 'Live',
  });
});

router.delete('/cars/:id', async (req, res) => {
  await prisma.carCategory.delete({
    where: { id: Number(req.params.id) },
  });
  res.json({ ok: true });
});

router.get('/payments', async (_req, res) => {
  const rows = await prisma.payment.findMany({
    where: { status: 'Completed' },
    orderBy: { id: 'desc' }
  });
  res.json(
    rows.map((p) => ({
      id: p.id,
      bookingId: p.bookingId || '',
      customer: p.customerName,
      amount: p.amount,
      method: p.method,
      status: p.status,
      date: p.date,
    })),
  );
});

router.get('/dashboard-stats', async (req, res) => {
  try {
    const allBookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const completed = allBookings.filter(b => b.status === 'COMPLETED');
    const dbCommissions = completed.reduce((sum, b) => sum + Math.floor((b.fare || 0) * 0.12), 0);
    const driverPayouts = completed.reduce((sum, b) => sum + ((b.fare || 0) - Math.floor((b.fare || 0) * 0.12)), 0);

    const approvedDrivers = await prisma.user.count({
      where: { role: 'DRIVER', driverProfile: { approvalStatus: 'APPROVED' } }
    });
    const totalDrivers = await prisma.user.count({ where: { role: 'DRIVER' } });
    const busyDrivers = await prisma.driverProfile.count({ where: { workStatus: 'BUSY' } });

    const completedPayments = await prisma.payment.findMany({
      where: { status: 'Completed' }
    });
    const paymentsTotal = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const walletBalance = paymentsTotal || completed.reduce((sum, b) => sum + (b.fare || 0), 0);
    const totalCommissions = dbCommissions;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revenueData = dayNames.map(name => ({ name, revenue: 0, commission: 0, driverPay: 0 }));

    completed.forEach(b => {
      if (b.bookingDate) {
        const date = new Date(b.bookingDate);
        if (!isNaN(date.getTime())) {
          const dayIndex = date.getDay(); // 0 Sunday, 1 Monday, ...
          const idx = dayIndex === 0 ? 6 : dayIndex - 1; // Mon -> 0, ..., Sun -> 6
          if (idx >= 0 && idx < 7) {
            const fare = Number(b.fare) || 0;
            const comm = Math.floor(fare * 0.12);
            revenueData[idx].revenue += fare;
            revenueData[idx].commission += comm;
            revenueData[idx].driverPay += (fare - comm);
          }
        }
      }
    });

    const pendingCount = allBookings.filter(b => b.status === 'PENDING').length;
    const assignedCount = allBookings.filter(b => b.status === 'ASSIGNED').length;
    const acceptedCount = allBookings.filter(b => b.status === 'ACCEPTED').length;
    const completedCount = completed.length;
    const cancelledCount = allBookings.filter(b => b.status === 'CANCELLED').length;

    const pieData = [
      { name: 'Completed', value: completedCount, color: '#22c55e' },
      { name: 'Pending', value: pendingCount + assignedCount + acceptedCount, color: '#eab308' },
      { name: 'Cancelled', value: cancelledCount, color: '#ef4444' },
    ];

    const totalBookingsCount = allBookings.length;
    const successRate = totalBookingsCount > 0 ? Math.round((completedCount / totalBookingsCount) * 100) : 100;
    const fleetUtil = totalDrivers > 0 ? Math.round((busyDrivers / totalDrivers) * 100) : (approvedDrivers > 0 ? 50 : 0);

    const operationalMetrics = [
      { labelKey: 'admin.booking_success_rate', val: `${successRate}%`, color: 'bg-green-500' },
      { labelKey: 'admin.driver_response_time', val: '2.5m', color: 'bg-primary' },
      { labelKey: 'admin.customer_satisfaction', val: completedCount > 0 ? '4.9/5' : '5.0/5', color: 'bg-blue-500' },
      { labelKey: 'admin.fleet_utilization', val: `${fleetUtil}%`, color: 'bg-red-500' },
    ];

    res.json({
      totalBookings: totalBookingsCount,
      approvedDrivers,
      totalCommissions,
      walletBalance,
      driverPayouts,
      revenueData,
      pieData,
      operationalMetrics
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
