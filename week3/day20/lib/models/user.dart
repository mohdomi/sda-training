class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? avatar;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatar,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
      avatar: json['avatar']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      if (avatar != null) 'avatar': avatar,
    };
  }
}

class AuthResponse {
  final User user;
  final String token;

  AuthResponse({required this.user, required this.token});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> data =
        (json['data'] as Map<String, dynamic>?) ?? json;
    final Map<String, dynamic> userJson =
        (data['user'] as Map<String, dynamic>?) ?? data;
    final String token = (data['token'] ??
            data['accessToken'] ??
            data['access_token'] ??
            '')
        .toString();
    return AuthResponse(
      user: User.fromJson(userJson),
      token: token,
    );
  }
}
