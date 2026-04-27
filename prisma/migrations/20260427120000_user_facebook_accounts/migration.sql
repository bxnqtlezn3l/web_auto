-- CreateTable
CREATE TABLE `user_facebook_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL DEFAULT 'บัญชี Facebook',
    `facebook_cookie` LONGTEXT NULL,
    `facebook_access_token` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_facebook_accounts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `active_facebook_account_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `user_facebook_accounts` ADD CONSTRAINT `user_facebook_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
