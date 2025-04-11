class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users, id: :uuid do |t|  # ✅ Use UUID for Primary Key
      t.string :name, null: false
      t.string :email, null: false  # ❌ Remove `unique: true` here
      t.string :password_digest, null: false
      t.string :role, null: false, default: 'student'

      t.timestamps
    end

    # ✅ Add uniqueness at the database level
    add_index :users, :email, unique: true
  end
end
