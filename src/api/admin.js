import service from '@/utils/request'

export function login(data) {
  return service.post('/admin/login', data)
}
