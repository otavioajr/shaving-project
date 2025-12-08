import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

/**
 * Seed script for development database
 * 
 * Creates minimal test data:
 * - 1 barbershop (barbearia-teste)
 * - 1 admin professional (admin@barbearia-teste.com)
 * - 1 barber professional (barber@barbearia-teste.com)
 * - 1 test client
 * - 3 services (haircut, beard trim, combo)
 * 
 * Idempotent: Safe to run multiple times
 * 
 * Note: We create a fresh PrismaClient instance with a different connection
 * to avoid prepared statement conflicts with the singleton when running multiple times.
 */

async function main() {
  // Use DIRECT_URL for seed script to bypass connection pooler
  // This avoids "prepared statement already exists" errors
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
    errorFormat: 'pretty',
  })

  console.log('🌱 Starting database seed...')

  try {
    // 1. Create or find barbershop
    let barbershop = await prisma.barbershop.findUnique({
      where: { slug: 'barbearia-teste' },
    })

    if (!barbershop) {
      barbershop = await prisma.barbershop.create({
        data: {
          name: 'Barbearia Teste',
          slug: 'barbearia-teste',
          isActive: true,
        },
      })
      console.log('✅ Created barbershop:', barbershop.name)
    } else {
      console.log('✓ Barbershop already exists:', barbershop.name)
    }

    // 2. Create admin professional
    const adminEmail = 'admin@barbearia-teste.com'
    let admin = await prisma.professional.findUnique({
      where: {
        barbershopId_email: {
          barbershopId: barbershop.id,
          email: adminEmail,
        },
      },
    })

    if (!admin) {
      const passwordHash = await bcryptjs.hash('senha123', 10)
      admin = await prisma.professional.create({
        data: {
          barbershopId: barbershop.id,
          name: 'Admin Teste',
          email: adminEmail,
          passwordHash,
          commissionRate: 0, // Admins don't get commission
          role: 'ADMIN',
          isActive: true,
        },
      })
      console.log('✅ Created admin professional:', admin.name)
    } else {
      console.log('✓ Admin professional already exists:', admin.name)
    }

    // 3. Create barber professional
    const barberEmail = 'barber@barbearia-teste.com'
    let barber = await prisma.professional.findUnique({
      where: {
        barbershopId_email: {
          barbershopId: barbershop.id,
          email: barberEmail,
        },
      },
    })

    if (!barber) {
      const passwordHash = await bcryptjs.hash('senha123', 10)
      barber = await prisma.professional.create({
        data: {
          barbershopId: barbershop.id,
          name: 'Barbeiro Teste',
          email: barberEmail,
          passwordHash,
          commissionRate: 50.0, // 50% commission
          role: 'BARBER',
          isActive: true,
        },
      })
      console.log('✅ Created barber professional:', barber.name)
    } else {
      console.log('✓ Barber professional already exists:', barber.name)
    }

    // 4. Create test client
    let client = await prisma.client.findUnique({
      where: {
        barbershopId_phone: {
          barbershopId: barbershop.id,
          phone: '11999999999',
        },
      },
    })

    if (!client) {
      client = await prisma.client.create({
        data: {
          barbershopId: barbershop.id,
          name: 'João Silva',
          phone: '11999999999',
          isActive: true,
        },
      })
      console.log('✅ Created client:', client.name)
    } else {
      console.log('✓ Client already exists:', client.name)
    }

    // 5. Create services
    const services = [
      { name: 'Corte de Cabelo', price: 50.0, duration: 30 },
      { name: 'Barba', price: 25.0, duration: 20 },
      { name: 'Corte + Barba', price: 70.0, duration: 45 },
    ]

    for (const serviceData of services) {
      const existingService = await prisma.service.findFirst({
        where: {
          barbershopId: barbershop.id,
          name: serviceData.name,
        },
      })

      if (!existingService) {
        await prisma.service.create({
          data: {
            barbershopId: barbershop.id,
            ...serviceData,
            isActive: true,
          },
        })
        console.log('✅ Created service:', serviceData.name)
      } else {
        console.log('✓ Service already exists:', serviceData.name)
      }
    }

    console.log('\n✨ Seed completed successfully!')
    console.log('\n📝 Test credentials:')
    console.log('   Admin: admin@barbearia-teste.com / senha123')
    console.log('   Barber: barber@barbearia-teste.com / senha123')
    console.log('\n🔑 Tenant header for API calls:')
    console.log('   x-tenant-slug: barbearia-teste')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
