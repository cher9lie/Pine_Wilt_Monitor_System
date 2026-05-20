<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" size="small" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 新建用户
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="filter-bar">
      <el-input v-model="searchText" placeholder="搜索用户名/姓名/部门" size="small" clearable class="search-input" @clear="loadUsers" @keyup.enter="loadUsers">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filterStatus" placeholder="状态" size="small" clearable @change="loadUsers" class="status-select">
        <el-option label="正常" value="active" />
        <el-option label="冻结" value="frozen" />
        <el-option label="归档" value="archived" />
      </el-select>
      <el-button size="small" @click="loadUsers">刷新</el-button>
    </div>

    <!-- 用户表格 -->
    <el-table :data="users" v-loading="loading" class="user-table" size="small" stripe>
      <el-table-column prop="username" label="用户名" width="120">
        <template #default="{ row }">
          <span class="username-cell">{{ row.username }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="real_name" label="姓名" width="120" />
      <el-table-column prop="department" label="部门" width="150" />
      <el-table-column label="角色" min-width="200">
        <template #default="{ row }">
          <el-tag v-for="role in row.roles" :key="role" size="small" class="role-tag" :type="getRoleTagType(role)">
            {{ getRoleLabel(role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : row.status === 'frozen' ? 'danger' : 'info'" size="small">
            {{ row.status === 'active' ? '正常' : row.status === 'frozen' ? '冻结' : '归档' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="data_level" label="数据级别" width="90">
        <template #default="{ row }">L{{ row.data_level }}</template>
      </el-table-column>
      <el-table-column prop="last_login_at" label="最后登录" width="160">
        <template #default="{ row }">
          {{ row.last_login_at ? new Date(row.last_login_at).toLocaleString('zh-CN') : '从未登录' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openRoleDialog(row)">角色</el-button>
          <el-button v-if="row.status === 'active'" size="small" text type="warning" @click="changeStatus(row.id, 'frozen')">冻结</el-button>
          <el-button v-if="row.status === 'frozen'" size="small" text type="success" @click="changeStatus(row.id, 'active')">解冻</el-button>
          <el-button v-if="row.username !== 'admin'" size="small" text type="danger" @click="changeStatus(row.id, 'archived')">归档</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="20"
        :total="totalCount"
        layout="total, prev, pager, next"
        small
        @current-change="loadUsers"
      />
    </div>

    <!-- 创建用户对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建用户" width="480px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="80px" size="small">
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" placeholder="3-50字符，字母数字下划线" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="createForm.real_name" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="createForm.department" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="createForm.role_names" multiple placeholder="选择角色" style="width:100%">
            <el-option v-for="role in allRoles" :key="role.name" :label="getRoleLabel(role.name)" :value="role.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据级别">
          <el-radio-group v-model="createForm.data_level">
            <el-radio :value="1">L1 公开</el-radio>
            <el-radio :value="2">L2 内部</el-radio>
            <el-radio :value="3">L3 涉密</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" size="small" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 角色编辑对话框 -->
    <el-dialog v-model="showRoleDialog" title="编辑角色" width="400px">
      <p class="role-dialog-hint">用户：{{ editingUser?.username }} ({{ editingUser?.real_name }})</p>
      <el-checkbox-group v-model="editRoles" class="role-checkbox-group">
        <el-checkbox v-for="role in allRoles" :key="role.name" :label="role.name" :value="role.name">
          {{ getRoleLabel(role.name) }}
          <span class="role-desc">{{ role.description }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button size="small" @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" size="small" @click="handleUpdateRoles">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { systemApi, type UserItem, type RoleItem } from '@/api/system'

const users = ref<UserItem[]>([])
const allRoles = ref<RoleItem[]>([])
const loading = ref(false)
const creating = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const searchText = ref('')
const filterStatus = ref('')

// 创建用户
const showCreateDialog = ref(false)
const createForm = reactive({
  username: '', password: '', real_name: '', department: '',
  role_names: [] as string[], data_level: 1,
})

// 角色编辑
const showRoleDialog = ref(false)
const editingUser = ref<UserItem | null>(null)
const editRoles = ref<string[]>([])

async function loadUsers() {
  loading.value = true
  try {
    const res = await systemApi.getUsers({
      page: currentPage.value,
      page_size: 20,
      search: searchText.value || undefined,
      status: filterStatus.value || undefined,
    })
    users.value = res.data.data.items
    totalCount.value = res.data.data.pagination.total
  } catch { ElMessage.error('加载用户列表失败') }
  finally { loading.value = false }
}

async function loadRoles() {
  try {
    const res = await systemApi.getRoles()
    allRoles.value = res.data.data
  } catch { /* ignore */ }
}

async function handleCreate() {
  if (!createForm.username || !createForm.password || createForm.role_names.length === 0) {
    return ElMessage.warning('请填写必填项')
  }
  creating.value = true
  try {
    await systemApi.createUser(createForm)
    ElMessage.success('用户创建成功')
    showCreateDialog.value = false
    Object.assign(createForm, { username: '', password: '', real_name: '', department: '', role_names: [], data_level: 1 })
    loadUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message ?? '创建失败')
  } finally { creating.value = false }
}

async function changeStatus(userId: string, status: 'active' | 'frozen' | 'archived') {
  const label = status === 'frozen' ? '冻结' : status === 'active' ? '解冻' : '归档'
  await ElMessageBox.confirm(`确定${label}该用户？`, '操作确认', { type: 'warning' })
  try {
    await systemApi.updateUserStatus(userId, status)
    ElMessage.success(`用户已${label}`)
    loadUsers()
  } catch { ElMessage.error('操作失败') }
}

function openRoleDialog(user: UserItem) {
  editingUser.value = user
  editRoles.value = [...user.roles]
  showRoleDialog.value = true
}

async function handleUpdateRoles() {
  if (!editingUser.value || editRoles.value.length === 0) {
    return ElMessage.warning('至少需要一个角色')
  }
  try {
    await systemApi.updateUserRoles(editingUser.value.id, editRoles.value)
    ElMessage.success('角色已更新')
    showRoleDialog.value = false
    loadUsers()
  } catch { ElMessage.error('更新失败') }
}

function getRoleLabel(name: string): string {
  const map: Record<string, string> = {
    admin: '系统管理员', db_admin: '数据库管理员', auditor: '审计员',
    rs_engineer: '遥感工程师', uav_operator: '无人机操作员', patrol_officer: '护林员',
    forest_manager: '林场管理员', user_admin: '用户管理员', finance_admin: '财务管理员',
    trainer: '培训师', bureau_leader: '林业局领导', forestry_station: '森防站',
    insurance_company: '保险公司', researcher: '科研人员', viewer: '查看者',
  }
  return map[name] ?? name
}

function getRoleTagType(name: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  if (['admin', 'db_admin', 'auditor'].includes(name)) return 'danger'
  if (['forest_manager', 'user_admin', 'finance_admin'].includes(name)) return 'warning'
  if (['bureau_leader', 'forestry_station'].includes(name)) return ''
  return 'info'
}

onMounted(() => { loadUsers(); loadRoles() })
</script>

<style scoped>
.users-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; }
.search-input { width: 260px; }
.status-select { width: 120px; }
.user-table { flex: 1; }
.username-cell { font-family: monospace; color: var(--color-accent); font-weight: 600; }
.role-tag { margin: 1px 2px; font-size: 11px; }
.pagination-bar { margin-top: 12px; display: flex; justify-content: flex-end; }
.role-dialog-hint { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 12px; }
.role-checkbox-group { display: flex; flex-direction: column; gap: 8px; }
.role-desc { font-size: 11px; color: var(--color-text-muted); margin-left: 8px; }

/* Element Plus 深色适配 */
:deep(.el-table) { --el-table-bg-color: var(--color-bg-panel); --el-table-tr-bg-color: var(--color-bg-panel); --el-table-header-bg-color: var(--color-bg-card); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
:deep(.el-table__row:hover td) { background: var(--color-bg-hover) !important; }
:deep(.el-dialog) { background: var(--color-bg-panel); border: 1px solid var(--color-border); }
:deep(.el-dialog__title) { color: var(--color-text-primary); }
:deep(.el-dialog__body) { color: var(--color-text-secondary); }
:deep(.el-input__wrapper) { background: var(--color-bg-card); border-color: var(--color-border); }
:deep(.el-input__inner) { color: var(--color-text-primary); }
:deep(.el-select .el-input__wrapper) { background: var(--color-bg-card); }
:deep(.el-checkbox__label) { color: var(--color-text-primary); }
:deep(.el-pagination) { --el-pagination-bg-color: transparent; --el-pagination-text-color: var(--color-text-secondary); }
</style>
