exports.up = async function(knex) {
    await knex.schema.createTable('crypto', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('crypto_id').unique().notNullable();
        table.string('public_key', 1000);
        table.string('private_key', 4000);
    })

    await knex.schema.createTable('devices', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('encro_key').notNullable();
        table.string('name').unique().notNullable();

        table.json('log_items');   // what parameters the device logs
        table.json('actions');     // actions available on the device
    });

    await knex.schema.createTable('device_logs', table => {
        table.increments('id');
        table.timestamp('time', { useTz: true }).defaultTo(knex.fn.now());
        table.json('data');
        table.integer('device_id').unsigned().notNullable()
            .references('id').inTable('devices')
            .onDelete('CASCADE'); // delete logs if device is deleted

        table.index(['device_id'], 'idx_device_logs_device_id');
    });

    await knex.schema.createTable('unverified_users', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('email').unique().notNullable();
        table.string('pass_hash');
        table.string('confirmation_code');
    });

    await knex.schema.createTable('users', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('email').unique().notNullable();
        table.string('session').defaultTo('session');
        table.string('pass_hash');
        table.string('role').checkIn(['super', 'admin', 'member', 'unverified']);

        table.index(['id', 'session'], 'idx_users_id_session');
    });

    await knex.schema.createTable('user_changepassword', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('confirmation_code').notNullable();
        table.integer('user_id').unsigned().unique().notNullable()
        .references('id').inTable('users')
        .onDelete('CASCADE'); // delete password changes if user deleted
    });

    await knex.schema.createTable('user_changeemail', table => {
        table.increments('id');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.integer('user_id').unsigned().unique().notNullable()
        .references('id').inTable('users')
        .onDelete('CASCADE'); // delete email changes if user deleted
        table.string('confirmation_code');
        table.string('new_email').notNullable();
    });
};


exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_changeemail');
  await knex.schema.dropTableIfExists('user_changepassword');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('unverified_users');
  await knex.schema.dropTableIfExists('device_logs');
  await knex.schema.dropTableIfExists('devices');
  await knex.schema.dropTableIfExists('crypto');
};