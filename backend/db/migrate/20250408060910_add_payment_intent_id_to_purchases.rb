class AddPaymentIntentIdToPurchases < ActiveRecord::Migration[7.2]
  def change
    add_column :purchases, :payment_intent_id, :string
  end
end
