<?php

namespace Database\Seeders;

use App\Models\Courier;
use App\Models\DeliveryItem;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@courier.test')],
            [
                'name' => env('ADMIN_NAME', 'Courier Admin'),
                'password' => env('ADMIN_PASSWORD', 'password'),
                'role' => User::ROLE_ADMIN,
                'email_verified_at' => now(),
            ],
        );

        $couriers = collect([
            [
                'email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test'),
                'name' => env('DEMO_COURIER_NAME', 'Demo Courier'),
                'password' => env('DEMO_COURIER_PASSWORD', 'password'),
                'first_name' => 'Demo',
                'last_name' => 'Courier',
                'phone_number' => '+995555010101',
                'car_plate_number' => 'TEST-101',
                'tariff' => 7.50,
            ],
            [
                'email' => 'courier2@courier.test',
                'name' => 'Luka Dvali',
                'password' => 'password',
                'first_name' => 'Luka',
                'last_name' => 'Dvali',
                'phone_number' => '+995555010102',
                'car_plate_number' => 'TEST-102',
                'tariff' => 8.00,
            ],
            [
                'email' => 'courier3@courier.test',
                'name' => 'Mariam Gogiashvili',
                'password' => 'password',
                'first_name' => 'Mariam',
                'last_name' => 'Gogiashvili',
                'phone_number' => '+995555010103',
                'car_plate_number' => null,
                'tariff' => 8.75,
            ],
        ])->mapWithKeys(function (array $courierData): array {
            $courierUser = User::query()->updateOrCreate(
                ['email' => $courierData['email']],
                [
                    'name' => $courierData['name'],
                    'password' => $courierData['password'],
                    'role' => User::ROLE_COURIER,
                    'email_verified_at' => now(),
                ],
            );

            $courier = Courier::query()->updateOrCreate(
                ['user_id' => $courierUser->id],
                [
                    'first_name' => $courierData['first_name'],
                    'last_name' => $courierData['last_name'],
                    'phone_number' => $courierData['phone_number'],
                    'car_plate_number' => $courierData['car_plate_number'],
                    'tariff' => $courierData['tariff'],
                ],
            );

            return [$courierData['email'] => $courier];
        });

        $partners = collect([
            [
                'email' => env('DEMO_PARTNER_EMAIL', 'partner@courier.test'),
                'name' => env('DEMO_PARTNER_NAME', 'Demo Partner'),
                'password' => env('DEMO_PARTNER_PASSWORD', 'password'),
                'phone_number' => '+995555020201',
                'pickup_address' => 'Saburtalo, Tbilisi',
                'tariff' => 12.50,
            ],
            [
                'email' => 'partner2@courier.test',
                'name' => 'Daily Market',
                'password' => 'password',
                'phone_number' => '+995555020202',
                'pickup_address' => 'Vake, Tbilisi',
                'tariff' => 10.00,
            ],
            [
                'email' => 'partner3@courier.test',
                'name' => 'Tech Point',
                'password' => 'password',
                'phone_number' => '+995555020203',
                'pickup_address' => 'Didube, Tbilisi',
                'tariff' => 14.25,
            ],
        ])->mapWithKeys(function (array $partnerData): array {
            $partnerUser = User::query()->updateOrCreate(
                ['email' => $partnerData['email']],
                [
                    'name' => $partnerData['name'],
                    'password' => $partnerData['password'],
                    'role' => User::ROLE_SELLER,
                    'email_verified_at' => now(),
                ],
            );

            $partner = Partner::query()->updateOrCreate(
                ['user_id' => $partnerUser->id],
                [
                    'name' => $partnerData['name'],
                    'phone_number' => $partnerData['phone_number'],
                    'pickup_address' => $partnerData['pickup_address'],
                    'tariff' => $partnerData['tariff'],
                ],
            );

            return [$partnerData['email'] => $partner];
        });

        foreach ([
            [
                'partner_email' => env('DEMO_PARTNER_EMAIL', 'partner@courier.test'),
                'courier_email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test'),
                'address' => 'Saburtalo, Zhvania Square 5',
                'district' => 'Saburtalo',
                'phone' => '+995555100000',
                'price' => 15.00,
                'comment' => 'Freshly added and not processed yet.',
                'product' => 'Starter package',
                'person_name' => 'Salome Nozadze',
                'delivery_status' => DeliveryItem::STATUS_NEW_ITEM,
                'delivery_date' => now()->addDay()->toDateString(),
                'actual_delivery_date' => null,
            ],
            [
                'partner_email' => env('DEMO_PARTNER_EMAIL', 'partner@courier.test'),
                'courier_email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test'),
                'address' => 'Saburtalo, Pekini Avenue 12',
                'district' => 'Saburtalo',
                'phone' => '+995555100001',
                'price' => 35.00,
                'comment' => 'Call on arrival.',
                'product' => 'Electronics package',
                'person_name' => 'Nino Beridze',
                'delivery_status' => DeliveryItem::STATUS_DELIVERED,
                'delivery_date' => now()->toDateString(),
                'actual_delivery_date' => now()->setTime(15, 20),
            ],
            [
                'partner_email' => 'partner2@courier.test',
                'courier_email' => 'courier2@courier.test',
                'address' => 'Vake, Chavchavadze Avenue 44',
                'district' => 'Vake',
                'phone' => '+995555100002',
                'price' => 18.50,
                'comment' => 'Customer canceled before dispatch.',
                'product' => 'Clothing order',
                'person_name' => 'Giorgi Lomidze',
                'delivery_status' => DeliveryItem::STATUS_CANCELED,
                'delivery_date' => now()->addDay()->toDateString(),
                'actual_delivery_date' => null,
            ],
            [
                'partner_email' => 'partner3@courier.test',
                'courier_email' => 'courier3@courier.test',
                'address' => 'Didube, Tsereteli Avenue 88',
                'district' => 'Didube',
                'phone' => '+995555100003',
                'price' => 52.00,
                'comment' => 'Customer requested next day delivery.',
                'product' => 'Kitchen appliance',
                'person_name' => 'Maka Japaridze',
                'delivery_status' => DeliveryItem::STATUS_POSTPONEMENT,
                'delivery_date' => now()->addDays(2)->toDateString(),
                'actual_delivery_date' => null,
            ],
            [
                'partner_email' => env('DEMO_PARTNER_EMAIL', 'partner@courier.test'),
                'courier_email' => 'courier2@courier.test',
                'address' => 'Gldani, Kerchi Street 9',
                'district' => 'Gldani',
                'phone' => '+995555100004',
                'price' => 24.00,
                'comment' => 'Canceled when courier arrived on site.',
                'product' => 'Cosmetics bundle',
                'person_name' => 'Ana Kapanadze',
                'delivery_status' => DeliveryItem::STATUS_CANCELLATION_ON_SITE,
                'delivery_date' => now()->toDateString(),
                'actual_delivery_date' => now()->setTime(13, 10),
            ],
            [
                'partner_email' => 'partner2@courier.test',
                'courier_email' => 'courier3@courier.test',
                'address' => 'Dighomi, King Mirian 18',
                'district' => 'Dighomi',
                'phone' => '+995555100005',
                'price' => 41.00,
                'comment' => 'Postponed after courier reached address.',
                'product' => 'Home decor set',
                'person_name' => 'Irakli Gelashvili',
                'delivery_status' => DeliveryItem::STATUS_POSTPONEMENT_AFTER_ARRIVE,
                'delivery_date' => now()->toDateString(),
                'actual_delivery_date' => now()->setTime(14, 45),
            ],
            [
                'partner_email' => 'partner3@courier.test',
                'courier_email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test'),
                'address' => 'Ortachala, Gorgasali Street 3',
                'district' => 'Ortachala',
                'phone' => '+995555100006',
                'price' => 29.00,
                'comment' => 'Redirected to a new address by customer.',
                'product' => 'Office supplies',
                'person_name' => 'Tamar Chikovani',
                'delivery_status' => DeliveryItem::STATUS_REDIRECT_ADDRESS,
                'delivery_date' => now()->addDay()->toDateString(),
                'actual_delivery_date' => null,
            ],
            [
                'partner_email' => 'partner2@courier.test',
                'courier_email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test'),
                'address' => 'Mtatsminda, Rustaveli Avenue 22',
                'district' => 'Mtatsminda',
                'phone' => '+995555100007',
                'price' => 63.00,
                'comment' => 'Scheduled future delivery slot.',
                'product' => 'Premium gadget',
                'person_name' => 'Levan Tsiklauri',
                'delivery_status' => DeliveryItem::STATUS_FUTURE_DELIVERY,
                'delivery_date' => now()->addDays(4)->toDateString(),
                'actual_delivery_date' => null,
            ],
            [
                'partner_email' => 'partner3@courier.test',
                'courier_email' => 'courier2@courier.test',
                'address' => 'Isani, Navtlughi Street 17',
                'district' => 'Isani',
                'phone' => '+995555100008',
                'price' => 22.00,
                'comment' => 'Leave at reception if unavailable.',
                'product' => 'Books set',
                'person_name' => 'Sopo Chkheidze',
                'delivery_status' => DeliveryItem::STATUS_DELIVERED,
                'delivery_date' => now()->subDay()->toDateString(),
                'actual_delivery_date' => now()->subDay()->setTime(18, 5),
            ],
            [
                'partner_email' => env('DEMO_PARTNER_EMAIL', 'partner@courier.test'),
                'courier_email' => 'courier3@courier.test',
                'address' => 'Avlabari, Ketevan Tsamebuli 55',
                'district' => 'Avlabari',
                'phone' => '+995555100009',
                'price' => 47.00,
                'comment' => 'Customer requested updated arrival time.',
                'product' => 'Small appliance',
                'person_name' => 'Dato Kereselidze',
                'delivery_status' => DeliveryItem::STATUS_FUTURE_DELIVERY,
                'delivery_date' => now()->addDays(3)->toDateString(),
                'actual_delivery_date' => null,
            ],
        ] as $deliveryItemData) {
            $partner = $partners->get($deliveryItemData['partner_email']);
            $courier = $couriers->get($deliveryItemData['courier_email']);

            if (! $partner || ! $courier) {
                continue;
            }

            DeliveryItem::query()->updateOrCreate(
                [
                    'partner_id' => $partner->id,
                    'address' => $deliveryItemData['address'],
                    'person_name' => $deliveryItemData['person_name'],
                ],
                [
                    'assigned_courier_id' => $courier->id,
                    'partner_id' => $partner->id,
                    'address' => $deliveryItemData['address'],
                    'district' => $deliveryItemData['district'],
                    'phone' => $deliveryItemData['phone'],
                    'price' => $deliveryItemData['price'],
                    'comment' => $deliveryItemData['comment'],
                    'product' => $deliveryItemData['product'],
                    'person_name' => $deliveryItemData['person_name'],
                    'delivery_status' => $deliveryItemData['delivery_status'],
                    'delivery_date' => $deliveryItemData['delivery_date'],
                    'actual_delivery_date' => $deliveryItemData['actual_delivery_date'],
                ],
            );
        }

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->call(DeliveryZoneSeeder::class);
        }
    }
}
