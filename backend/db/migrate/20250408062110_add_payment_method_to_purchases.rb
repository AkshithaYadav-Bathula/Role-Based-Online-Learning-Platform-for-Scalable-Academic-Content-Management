class AddPaymentMethodToPurchases < ActiveRecord::Migration[7.2]
  def change
    add_column :purchases, :payment_method, :string, default: "stripe_payment_intent"
  end
end
