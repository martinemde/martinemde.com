---
title: 'How to convert to `params.expect` in Rails 8.0'
date: 2024-12-21
author: Martin Emde
description: 'A practical guide to converting existing Rails controllers to use params.expect'
published: true
slug: how-to-convert-to-rails-params-expect
---

After updating RubyGems.org to use [the new `params.expect` feature](/blog/how-to-rails-params-expect)
in Rails 8, I thought it might be helpful to go over a few of the challenges I ran into.

## Why Should I Convert to `params.expect`?

The new `expect` method for filtering params protects against user param tampering that can cause hard to rescue errors.

As a quick review of the feature, when we have code like this:

```ruby
user_params = params.require(:user).permit(:name, :handle)
```

We're vulnerable to users calling our action like this:

```ruby
post "/users", params: { user: "error" }
user_params = params.require(:user).permit(:name, :handle)
# undefined method `permit' for an instance of String
```

By using the new `params.expect` we can prevent this problem (and another I'll discuss below) all while cleaning up our params handling.

```ruby
post "/users", params: { user: "error" }
user_params = params.expect(user: [:name, :handle])
# responds as if the required :user key was not sent at all, rendering a 400 error
```

Remember that with valid params, the values at the expected key(s) will be returned, just like with `require`.

```ruby
post "/users", params: { user: { name: "Martin", handle: "martinemde" }
user_params = params.expect(user: [:name, :handle])
# => { name: "Martin", handle: "martinemde" }
```

## The Easy Part

The conversion follows a consistent pattern.

```ruby
# OLD
user_params = params.require(:user).permit(:name, :handle)

# NEW
user_params = params.expect(user: [:name, :handle])
```

For methods that permit a mix of scalars and hashes, the conversion is also straightforward:

```ruby
# OLD
user_params = params.require(:user).permit(:name, :handle, :image, address: [:street, :city])

# NEW
user_params = params.expect(user: [:name, :handle, :image, { address: [:street, :city] }])
```

## The Challenge

The challenge comes when you have conditional or complex parameter handling, especially when you're doing something like this:

```ruby
# OLD: Conditional parameters
user_params = params.require(:user).permit(:name, :handle)
user_params[:admin] = true if current_user.admin?

# OR

# OLD: Multiple permit calls
base_params = params.require(:user).permit(:name, :handle)
admin_params = params.require(:user).permit(:admin) if current_user.admin?
user_params = base_params.merge(admin_params || {})
```

## Solution 1: Extract All Parameters First

The simplest approach is to extract all the parameters you might need and then conditionally use them:

```ruby
# NEW: Extract all potential parameters
if current_user.admin?
  user_params = params.expect(user: [:name, :handle, :admin])
else
  user_params = params.expect(user: [:name, :handle])
end
```

Or more concisely:

```ruby
# NEW: Conditional parameter list
permitted_keys = [:name, :handle]
permitted_keys << :admin if current_user.admin?
user_params = params.expect(user: permitted_keys)
```

## Solution 2: Use Multiple expect Calls

For complex cases, you can still use multiple `expect` calls:

```ruby
# NEW: Multiple expect calls
user_params = params.expect(user: [:name, :handle])
user_params[:admin] = params.expect(user: [:admin])[:admin] if current_user.admin?
```

Though this is less elegant than the single-call approach.

## Solution 3: Helper Methods

For really complex parameter handling, consider extracting logic into helper methods:

```ruby
private

def user_params
  if current_user.admin?
    params.expect(user: [:name, :handle, :admin])
  else
    params.expect(user: [:name, :handle])
  end
end
```

## Testing Your Conversion

When converting to `params.expect`, make sure to test edge cases:

```ruby
# Test with tampered params
test "handles tampered user param as string" do
  post users_path, params: { user: "tampered" }
  assert_response :bad_request
end

test "handles tampered user param as array" do
  post users_path, params: { user: ["tampered"] }
  assert_response :bad_request
end

test "handles missing user param" do
  post users_path, params: {}
  assert_response :bad_request
end
```

## My Experience Converting RubyGems.org

Beyond security improvements, `params.expect` also provides clearer intent with parameter structure explicitly declared. You get better error messages with more specific feedback, and more consistent behavior with less underspecified edge cases.

When I converted RubyGems.org to use `params.expect`, I found that most conversions were straightforward. Complex parameter handling became more explicit and easier to understand. We caught several edge cases we hadn't properly handled before and the code became more self-documenting.

Converting to `params.expect` improves security and code clarity. Start with the simple cases, and don't be afraid to use conditional logic or helper methods for complex parameter handling.

The key is to think about your parameter structure upfront and declare it explicitly rather than building it up incrementally.
