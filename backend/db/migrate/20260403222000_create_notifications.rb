class CreateNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :notifications, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :actor_id
      t.uuid :course_id
      t.uuid :course_doubt_id
      t.string :kind, null: false
      t.string :title, null: false
      t.text :message, null: false
      t.datetime :read_at

      t.timestamps
    end

    add_foreign_key :notifications, :users, on_delete: :cascade
    add_foreign_key :notifications, :users, column: :actor_id, on_delete: :nullify
    add_foreign_key :notifications, :courses, on_delete: :cascade
    add_foreign_key :notifications, :course_doubts, on_delete: :cascade

    add_index :notifications, [:user_id, :created_at]
    add_index :notifications, [:user_id, :read_at]
    add_index :notifications, :kind
  end
end
