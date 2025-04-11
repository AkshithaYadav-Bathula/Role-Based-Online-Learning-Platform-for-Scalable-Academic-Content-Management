class CreatePurchases < ActiveRecord::Migration[7.2]
  def change
    create_table :purchases, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :course_id, null: false
      t.decimal :amount, null: false, precision: 10, scale: 2
      t.string :status, null: false, default: 'pending'

      t.timestamps
    end
    add_foreign_key :purchases, :users, on_delete: :cascade
    add_foreign_key :purchases, :courses, on_delete: :cascade
  end
end
