class AddRoleCheckConstraintToUsers < ActiveRecord::Migration[7.2]
  def up
    execute <<~SQL
      UPDATE users
      SET role = 'student'
      WHERE role IS NULL OR role NOT IN ('student', 'educator');
    SQL

    add_check_constraint :users,
                         "role IN ('student', 'educator')",
                         name: 'users_role_allowed_values'

    add_index :users, :role unless index_exists?(:users, :role)
  end

  def down
    remove_check_constraint :users, name: 'users_role_allowed_values'
    remove_index :users, :role if index_exists?(:users, :role)
  end
end
