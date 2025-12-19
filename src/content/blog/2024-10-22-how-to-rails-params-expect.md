---
title: 'How to: Rails `params.expect`'
date: 2024-10-22
author: Martin Emde
description: 'A guide to the new params.expect feature in Rails 8'
published: true
slug: how-to-rails-params-expect
---

In this post I will describe [the new `params.expect` feature](https://github.com/rails/rails/pull/51674) that I recently added to Rails 8 and go over how it works and how to use it.

Update: For an implementation guide, see [my second post on `params.expect`](/blog/how-to-convert-to-rails-params-expect).

## params: An Attack Vector

All web application programmers learn not to trust user input.

Rails has long provided a simple pattern to prevent param tampering: `params.permit`. This protects our app from users that may alter params in order to insert attributes or alter behavior, like assigning admin to yourself.

```ruby
def update
  user_params = params.require(:user).permit(:name, :favorite_pie)

  if @user.update(user_params)
    redirect_to :user
  else
    render :edit
  end
end
```

This works great when users submit the form correctly and even when they try to insert extra fields, like `admin=true` into the params. These attacks get filtered out.

But protecting us from correctly submitted forms and extra attributes is not enough. What if, as we regularly see on RubyGems.org, a user is trying to break your application by submitting malformed params? Problems start to emerge.

The solution in Rails 8 is the new `params.expect`.

## How do I use `params.expect`?

If you don't want to dig into Rails parameter filtering right now, you can simply do the following in Rails 8:

```ruby
def update
  # OLD
  # user_params = params.require(:user).permit(:name, :favorite_pie)

  # NEW (see how it mirrors the expected params?)
  user_params = params.expect(user: [:name, :favorite_pie])

  if @user.update(user_params)
    redirect_to :user
  else
    render :edit
  end
end
```

The `expect` method behaves very similarly to `require(:user).permit(:name, :favorite_pie)`, but it is much more explicit about exactly what the parameters should look like and rejects any params that don't exactly match the expected structure.

Let's be very clear about what each type of parameter looks like and how to declare them in `expect`:

```ruby
# A Hash:
PATCH /users/1/?user[name]=martin&user[favorite_pie]=pumpkin
# params = { "user" => { "name" => "martin", "favorit_pie" => "pumpkin" } }

# An Array:
POST /pies?pies[][flavor]=pumpkin&pies[][flavor]=pecan
# params = { "pies" => [
#            { "flavor" => "pumpkin" },
#            { "flavor" => "pecan" }
#          ] }

# A String:
POST /search?q=hello+world
# params = { "q" => "hello world" }
```

Each parameter type needs to be declared slightly differently in `expect`:

```ruby
# Extract a Hash containing name and favorite_pie keys
params.expect(user: [:name, :favorite_pie])

# Extract an Array containing Hashes, each with a :flavor key
# (note: the Array syntax is more explicit than `permit`)
params.expect(pies: [{ flavor: [] }])
#     Note the explicit Array format above: ^^         ^^

# Extract a String
params.expect(:q)
```

The rest of this post will dig into why and how the new syntax works, how to use it, and some of the gotchas that you might experience with this change.

## The Problem of Params Tampering

Let's start by exploring the core problem this new feature solves: params tampering that causes uncaught exceptions.

Here's what can happen with the traditional Rails approach when params are tampered with:

```ruby
class UsersController < ApplicationController
  def update
    user_params = params.require(:user).permit(:name, :favorite_pie)

    if @user.update(user_params)
      redirect_to @user
    else
      render :edit
    end
  end
end
```

### When params are tampered to be a String

```ruby
# Normal form submission:
# params = { "user" => { "name" => "martin", "favorite_pie" => "pumpkin" } }

# Tampered to be a String:
# params = { "user" => "tampered_string" }

user_params = params.require(:user).permit(:name, :favorite_pie)
# => ActionController::UnfilteredParameters: unable to convert unpermitted parameters to hash
```

### When params are tampered to be an Array

```ruby
# Tampered to be an Array:
# params = { "user" => ["tampered", "array"] }

user_params = params.require(:user).permit(:name, :favorite_pie)
# => ActionController::UnfilteredParameters: unable to convert unpermitted parameters to hash
```

Both of these examples show how parameter tampering can cause unhandled exceptions in your Rails application, leading to 500 errors for your users instead of graceful error handling.

## What's going on exactly?

The problem happens when `params.require(:user)` returns something that doesn't respond to `permit`. When the user parameter is a string or array instead of a hash, `permit` fails.

The old workaround was something ugly like this:

```ruby
# ugly
user_params = params.require(:user)
raise ActionController::ParameterMissing.new(:user, {}) unless user_params.respond_to?(:permit)
user_params = user_params.permit(:name, :favorite_pie)
```

I discovered a better version when I was trying to solve this problem for RubyGems.org. It has a few flaws, but it works well enough.

```ruby
# better
user_params = params.fetch(:user, {}).permit(:name, :favorite_pie)
raise ActionController::ParameterMissing.new(:user, {}) if user_params.empty?
```

`params.expect` replaces all of this mess with clear, declarative syntax that also provides better error messages and handles edge cases properly.

## `params.expect` to the rescue

The new `expect` method validates both the presence and structure of the parameters:

```ruby
# This expects :user to be a Hash with :name and :favorite_pie keys
user_params = params.expect(user: [:name, :favorite_pie])

# If user is missing:
# => ActionController::ParameterMissing

# If user is not a Hash (e.g., String or Array):
# => ActionController::ParameterMissing
```

By resolving this ambiguity in params parsing and improving the syntax and security of features used by every Rails engineer, we are able to reduce false alarms, better protect application data, and maybe reduce the number of engineers getting paged in the middle of the night.

## Let's keep making this better

Right now I'm committed to improving the Ruby, RubyGems, and Ruby on Rails ecosystems for everyone. The RubyGems.org team, and I "upstream" improvements to the gems we use as a matter of principle. We want Ruby to be the best choice for building applications. We also work closely with other ecosystems like Python and Rust, to ensure best practices across languages.

Are you and your company comfortable with your reliance on open source? To avoid worst case scenarios, your company needs at least one engineer on your team dedicating their time to open source maintenance.
If you use Ruby, then you rely on the work of the RubyGems team. I'd love to work with you to help your team succeed in the Ruby ecosystem.
